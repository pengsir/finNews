import "dotenv/config";
import { prisma } from "@/server/db/prisma";
import { getDailyReportAutomationSetting } from "@/server/automation/settings";
import { runDailyPipeline } from "@/server/jobs/run-daily-pipeline";

function getEasternParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part: Intl.DateTimeFormatPart) => [part.type, part.value])
  );

  return {
    year: Number.parseInt(values.year, 10),
    month: Number.parseInt(values.month, 10),
    day: Number.parseInt(values.day, 10),
    hour: Number.parseInt(values.hour, 10),
    minute: Number.parseInt(values.minute, 10)
  };
}

function buildMarketDateFromEastern(parts: ReturnType<typeof getEasternParts>) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 13, 0, 0, 0));
}

async function main() {
  const setting = await getDailyReportAutomationSetting();
  const eastern = getEasternParts();
  const currentMinutes = eastern.hour * 60 + eastern.minute;
  const scheduledMinutes = setting.scheduleHourEt * 60 + setting.scheduleMinuteEt;
  const easternDateKey = `${eastern.year}-${String(eastern.month).padStart(2, "0")}-${String(
    eastern.day
  ).padStart(2, "0")}`;

  if (currentMinutes < scheduledMinutes || currentMinutes >= scheduledMinutes + 5) {
    console.log(
      JSON.stringify({
        ok: true,
        skipped: true,
        reason: "outside_schedule_window",
        easternDateKey
      })
    );
    return;
  }

  if (setting.lastScheduledDateEt === easternDateKey) {
    console.log(
      JSON.stringify({
        ok: true,
        skipped: true,
        reason: "already_scheduled_today",
        easternDateKey
      })
    );
    return;
  }

  const marketDate = buildMarketDateFromEastern(eastern);
  const existingReport = await prisma.dailyReport.findUnique({
    where: {
      marketDate
    },
    select: {
      id: true,
      status: true
    }
  });

  if (existingReport?.status === "PUBLISHED") {
    await prisma.automationSetting.update({
      where: {
        id: setting.id
      },
      data: {
        lastScheduledDateEt: easternDateKey
      }
    });

    console.log(
      JSON.stringify({
        ok: true,
        skipped: true,
        reason: "report_already_published",
        easternDateKey
      })
    );
    return;
  }

  const result = await runDailyPipeline("CRON");

  await prisma.automationSetting.update({
    where: {
      id: setting.id
    },
    data: {
      lastScheduledDateEt: easternDateKey
    }
  });

  console.log(
    JSON.stringify({
      ok: true,
      skipped: false,
      scheduledForEt: easternDateKey,
      result
    })
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
