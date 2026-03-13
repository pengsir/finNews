import { prisma } from "@/server/db/prisma";
import { getDailyReportAutomationSetting } from "@/server/automation/settings";

export async function getAdminDashboardData() {
  const [adminUser, aiConfigs, sources, reports, recentFeedback, recentJobs, automationSetting] = await Promise.all([
    prisma.adminUser.findFirst({
      orderBy: {
        createdAt: "asc"
      }
    }),
    prisma.aiProviderConfig.findMany({
      orderBy: [{ createdAt: "asc" }]
    }),
    prisma.newsSource.findMany({
      orderBy: [{ isActive: "desc" }, { weight: "desc" }, { name: "asc" }]
    }),
    prisma.dailyReport.findMany({
      orderBy: {
        marketDate: "desc"
      },
      take: 10,
      include: {
        _count: {
          select: {
            pageViews: true,
            feedbackEntries: true
          }
        },
        feedbackEntries: {
          where: {
            reaction: "UNLIKE"
          },
          select: {
            id: true
          }
        }
      }
    }),
    prisma.reportFeedback.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: 12,
      include: {
        report: {
          select: {
            slug: true,
            title: true
          }
        }
      }
    }),
    prisma.jobRun.findMany({
      where: {
        jobType: "daily-report"
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 8
    }),
    getDailyReportAutomationSetting()
  ]);

  const totals = reports.reduce(
    (summary, report) => {
      summary.views += report._count.pageViews;
      summary.feedback += report._count.feedbackEntries;
      summary.unlikes += report.feedbackEntries.length;
      return summary;
    },
    { views: 0, feedback: 0, unlikes: 0 }
  );

  return {
    adminUser,
    aiConfigs,
    sources,
    reports,
    recentFeedback,
    recentJobs,
    automationSetting,
    totals
  };
}
