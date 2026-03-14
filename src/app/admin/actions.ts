"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { getDailyReportAutomationSetting } from "@/server/automation/settings";
import {
  clearAdminSession,
  createAdminSession,
  requireAdminAuth,
  updateAdminPassword,
  validateAdminCredentials
} from "@/server/admin/auth";

function parseBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function requireString(value: FormDataEntryValue | null, field: string) {
  const parsed = value?.toString().trim();

  if (!parsed) {
    throw new Error(`${field} is required.`);
  }

  return parsed;
}

async function dispatchPipelineWorkflow(triggerSource: string) {
  const token = process.env.GITHUB_ACTIONS_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const workflowId =
    process.env.GITHUB_PIPELINE_WORKFLOW_ID ?? "pipeline-runner.yml";
  const ref = process.env.GITHUB_REPO_REF ?? "master";

  if (!token || !owner || !repo) {
    throw new Error(
      "GitHub Actions dispatch is not configured. Set GITHUB_ACTIONS_TOKEN, GITHUB_REPO_OWNER, and GITHUB_REPO_NAME in the deployment environment."
    );
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ref,
        inputs: {
          trigger_source: triggerSource
        }
      }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GitHub Actions dispatch failed (${response.status}): ${errorText}`
    );
  }
}

async function ensurePipelineIdle() {
  const runningJob = await prisma.jobRun.findFirst({
    where: {
      jobType: "daily-report",
      status: "RUNNING"
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (runningJob) {
    throw new Error("A daily pipeline job is running. Wait for it to finish before changing configuration.");
  }
}

export async function loginAction(formData: FormData) {
  const username = requireString(formData.get("username"), "Username");
  const password = requireString(formData.get("password"), "Password");

  if (!(await validateAdminCredentials(username, password))) {
    redirect("/admin/login?error=invalid_credentials" as never);
  }

  await createAdminSession(username);
  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login" as never);
}

export async function saveAiConfigAction(formData: FormData) {
  await requireAdminAuth();
  await ensurePipelineIdle();

  const id = formData.get("id")?.toString().trim();
  let activate = parseBoolean(formData.get("activate"));
  const apiKeyInput = formData.get("apiKey")?.toString();
  const provider = requireString(formData.get("provider"), "Provider");
  const model = requireString(formData.get("model"), "Model");
  const labelInput = formData.get("label")?.toString().trim();
  const data = {
    label: labelInput || `${provider} ${model}`,
    provider,
    baseUrl: requireString(formData.get("baseUrl"), "Base URL"),
    model,
    apiKey: apiKeyInput && apiKeyInput.trim().length > 0 ? apiKeyInput.trim() : null
  };

  if (id && !activate) {
    const [existing, activeCount] = await Promise.all([
      prisma.aiProviderConfig.findUnique({
        where: { id },
        select: { isActive: true }
      }),
      prisma.aiProviderConfig.count({
        where: { isActive: true }
      })
    ]);

    if (existing?.isActive && activeCount <= 1) {
      activate = true;
    }
  }

  if (activate) {
    await prisma.aiProviderConfig.updateMany({
      data: {
        isActive: false
      }
    });
  }

  if (id) {
    await prisma.aiProviderConfig.update({
      where: { id },
      data: {
        ...data,
        isActive: activate
      }
    });
  } else {
    await prisma.aiProviderConfig.create({
      data: {
        ...data,
        isActive: activate
      }
    });
  }

  revalidatePath("/admin");
}

export async function activateAiConfigAction(formData: FormData) {
  await requireAdminAuth();
  await ensurePipelineIdle();

  const id = requireString(formData.get("id"), "Config id");

  await prisma.$transaction([
    prisma.aiProviderConfig.updateMany({
      data: {
        isActive: false
      }
    }),
    prisma.aiProviderConfig.update({
      where: { id },
      data: {
        isActive: true
      }
    })
  ]);

  revalidatePath("/admin");
}

export async function deactivateAiConfigAction(formData: FormData) {
  await requireAdminAuth();
  await ensurePipelineIdle();

  const id = requireString(formData.get("id"), "Config id");

  await prisma.aiProviderConfig.update({
    where: { id },
    data: {
      isActive: false
    }
  });

  revalidatePath("/admin");
}

export async function deleteAiConfigAction(formData: FormData) {
  await requireAdminAuth();
  await ensurePipelineIdle();

  const id = requireString(formData.get("id"), "Config id");
  const count = await prisma.aiProviderConfig.count();

  if (count <= 1) {
    throw new Error("Keep at least one AI configuration.");
  }

  await prisma.aiProviderConfig.delete({
    where: { id }
  });

  const activeConfig = await prisma.aiProviderConfig.findFirst({
    where: { isActive: true }
  });

  if (!activeConfig) {
    const fallback = await prisma.aiProviderConfig.findFirst({
      orderBy: {
        updatedAt: "desc"
      }
    });

    if (fallback) {
      await prisma.aiProviderConfig.update({
        where: { id: fallback.id },
        data: { isActive: true }
      });
    }
  }

  revalidatePath("/admin");
}

export async function saveNewsSourceAction(formData: FormData) {
  await requireAdminAuth();
  await ensurePipelineIdle();

  const id = formData.get("id")?.toString().trim();
  const data = {
    name: requireString(formData.get("name"), "Name"),
    slug: requireString(formData.get("slug"), "Slug"),
    feedUrl: requireString(formData.get("feedUrl"), "Feed URL"),
    sourceType: requireString(formData.get("sourceType"), "Source type"),
    weight: Number.parseFloat(requireString(formData.get("weight"), "Weight")),
    isActive: parseBoolean(formData.get("isActive"))
  };

  if (!Number.isFinite(data.weight) || data.weight <= 0) {
    throw new Error("Weight must be a positive number.");
  }

  if (id) {
    await prisma.newsSource.update({
      where: { id },
      data
    });
  } else {
    await prisma.newsSource.create({
      data
    });
  }

  revalidatePath("/admin");
}

export async function deleteNewsSourceAction(formData: FormData) {
  await requireAdminAuth();
  await ensurePipelineIdle();

  const id = requireString(formData.get("id"), "Source id");

  await prisma.newsSource.delete({
    where: { id }
  });

  revalidatePath("/admin");
}

export async function runPipelineAction() {
  await requireAdminAuth();
  await ensurePipelineIdle();

  try {
    await dispatchPipelineWorkflow("ADMIN");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline failed.";
    redirect(
      `/admin?tab=automation&run=error&message=${encodeURIComponent(message)}` as never
    );
  }

  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath("/admin");
  redirect("/admin?tab=automation&run=started&message=GitHub%20Actions%20workflow%20dispatched." as never);
}

export async function clearRunningPipelineJobAction() {
  await requireAdminAuth();

  const runningJobs = await prisma.jobRun.findMany({
    where: {
      jobType: "daily-report",
      status: "RUNNING"
    },
    select: {
      id: true
    }
  });

  if (runningJobs.length === 0) {
    redirect("/admin?tab=automation&run=error&message=No%20running%20job%20to%20clear." as never);
  }

  await prisma.jobRun.updateMany({
    where: {
      id: {
        in: runningJobs.map((job) => job.id)
      }
    },
    data: {
      status: "FAILED",
      finishedAt: new Date(),
      message: "Manually cleared from admin automation panel."
    }
  });

  revalidatePath("/admin");
  redirect("/admin?tab=automation&run=cleared" as never);
}

export async function saveAutomationScheduleAction(formData: FormData) {
  await requireAdminAuth();

  const scheduleHourEt = Number.parseInt(
    requireString(formData.get("scheduleHourEt"), "Schedule hour"),
    10
  );
  const scheduleMinuteEt = Number.parseInt(
    requireString(formData.get("scheduleMinuteEt"), "Schedule minute"),
    10
  );

  if (!Number.isInteger(scheduleHourEt) || scheduleHourEt < 0 || scheduleHourEt > 23) {
    throw new Error("Schedule hour must be between 0 and 23.");
  }

  if (!Number.isInteger(scheduleMinuteEt) || scheduleMinuteEt < 0 || scheduleMinuteEt > 59) {
    throw new Error("Schedule minute must be between 0 and 59.");
  }

  const setting = await getDailyReportAutomationSetting();

  await prisma.automationSetting.update({
    where: {
      id: setting.id
    },
    data: {
      scheduleHourEt,
      scheduleMinuteEt
    }
  });

  revalidatePath("/admin");
  redirect("/admin?tab=automation&schedule=updated" as never);
}

export async function updateAdminPasswordAction(formData: FormData) {
  await requireAdminAuth();

  const currentPassword = requireString(formData.get("currentPassword"), "Current password");
  const nextPassword = requireString(formData.get("nextPassword"), "New password");
  const confirmPassword = requireString(formData.get("confirmPassword"), "Password confirmation");

  if (nextPassword.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }

  if (nextPassword !== confirmPassword) {
    throw new Error("New password and confirmation do not match.");
  }

  await updateAdminPassword(currentPassword, nextPassword);
  revalidatePath("/admin");
}
