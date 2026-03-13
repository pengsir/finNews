import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireAdminAuth } from "@/server/admin/auth";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  await requireAdminAuth();

  const { id } = await context.params;
  const job = await prisma.jobRun.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      message: true,
      finishedAt: true
    }
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json(job);
}
