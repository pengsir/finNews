import { prisma } from "@/server/db/prisma";

const DEFAULT_SCHEDULE = {
  jobType: "daily-report",
  scheduleHourEt: 9,
  scheduleMinuteEt: 0
};

export async function getDailyReportAutomationSetting() {
  const existing = await prisma.automationSetting.findUnique({
    where: {
      jobType: DEFAULT_SCHEDULE.jobType
    }
  });

  if (existing) {
    return existing;
  }

  return prisma.automationSetting.create({
    data: DEFAULT_SCHEDULE
  });
}

export function formatScheduleLabel(hourEt: number, minuteEt: number) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York"
  });

  const date = new Date(Date.UTC(2026, 0, 1, hourEt + 5, minuteEt, 0, 0));
  return `${formatter.format(date)} ET`;
}
