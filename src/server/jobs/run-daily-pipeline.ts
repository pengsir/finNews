import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { getAiClient } from "@/server/ai/get-client";
import { getAiRuntimeConfig } from "@/server/ai/provider-config";
import { normalizeGeneratedReport } from "@/server/ai/normalize-generated-report";
import { buildEventCandidates } from "@/server/news/dedupe-rank";
import { ingestSources } from "@/server/news/ingest";
import type { ReportEventInput } from "@/server/ai/types";

function getMarketDate(inputDate = new Date()) {
  return new Date(
    Date.UTC(
      inputDate.getUTCFullYear(),
      inputDate.getUTCMonth(),
      inputDate.getUTCDate(),
      13,
      0,
      0,
      0
    )
  );
}

function buildReportSlug(marketDate: Date) {
  return `${marketDate.toISOString().slice(0, 10)}-pre-market-brief`;
}

function buildEventSlug(eventKey: string, marketDate: Date) {
  return `${eventKey}-${marketDate.toISOString().slice(0, 10)}`;
}

async function createPipelineJobRun(triggerSource: string) {
  const marketDate = getMarketDate();
  const runtimeConfig = await getAiRuntimeConfig();
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
    throw new Error("A daily pipeline job is already running.");
  }

  const jobRun = await prisma.jobRun.create({
    data: {
      jobType: "daily-report",
      triggerSource,
      aiProvider: runtimeConfig.provider,
      aiModel: runtimeConfig.model,
      status: "RUNNING",
      startedAt: new Date(),
      message: `Starting daily pipeline for ${marketDate.toISOString().slice(0, 10)}`
    }
  });

  return {
    jobRun,
    marketDate,
    runtimeConfig
  };
}

async function executeDailyPipelineJob({
  jobRunId,
  marketDate,
  runtimeConfig,
  triggerSource
}: {
  jobRunId: string;
  marketDate: Date;
  runtimeConfig: Awaited<ReturnType<typeof getAiRuntimeConfig>>;
  triggerSource: string;
}) {
  try {
    const activeSources = await prisma.newsSource.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        weight: "desc"
      }
    });

    const sourceMap = new Map(activeSources.map((source) => [source.id, source]));
    const ingestionResults = await ingestSources(activeSources, marketDate);
    const ingestedItems = ingestionResults.flatMap((result) => result.items);

    const rawItems = await Promise.all(
      ingestedItems.map((item) =>
        prisma.rawNewsItem.upsert({
          where: {
            url: item.url
          },
          update: {
            sourceId: item.sourceId,
            externalId: item.externalId,
            title: item.title,
            language: item.language,
            publishedAt: item.publishedAt,
            summary: item.summary,
            content: item.content,
            importanceHint: item.importanceHint
          },
          create: {
            sourceId: item.sourceId,
            externalId: item.externalId,
            title: item.title,
            url: item.url,
            language: item.language,
            publishedAt: item.publishedAt,
            summary: item.summary,
            content: item.content,
            importanceHint: item.importanceHint
          }
        })
      )
    );

    const rawItemByUrl = new Map(rawItems.map((item) => [item.url, item]));
    const eventCandidates = buildEventCandidates(ingestedItems, sourceMap).slice(0, 20);
    const aiClient = await getAiClient();
    const rankedEvents = await aiClient.scoreEvents(
      eventCandidates.map((event) => ({
        id: buildEventSlug(event.eventKey, marketDate),
        title: event.title,
        summary: event.summary,
        sourceCount: event.rawItems.length,
        sectors: event.sectors,
        tickers: event.tickers,
        importanceScore: event.importanceScore,
        sentiment: event.sentiment
      }))
    );
    const reportEventInputs: ReportEventInput[] = rankedEvents.map((rankedEvent) => {
      const candidate = eventCandidates.find(
        (event) => buildEventSlug(event.eventKey, marketDate) === rankedEvent.id
      );

      return {
        ...rankedEvent,
        sources:
          candidate?.rawItems.slice(0, 3).map((item) => ({
            sourceSlug: item.sourceSlug,
            sourceName: sourceMap.get(item.sourceId)?.name ?? item.sourceSlug,
            title: item.title.slice(0, 180),
            summary: item.summary.slice(0, 260),
            url: item.url,
            publishedAt: item.publishedAt.toISOString()
          })) ?? []
      };
    });

    const persistedEvents = [];

    for (const rankedEvent of rankedEvents) {
      const candidate = eventCandidates.find((event) => buildEventSlug(event.eventKey, marketDate) === rankedEvent.id);

      if (!candidate) {
        continue;
      }

      const eventRecord = await prisma.newsEvent.upsert({
        where: {
          slug: rankedEvent.id
        },
        update: {
          title: rankedEvent.title,
          summary: rankedEvent.summary,
          sentiment: rankedEvent.sentiment,
          importanceScore: rankedEvent.importanceScore,
          sectors: rankedEvent.sectors,
          tickers: rankedEvent.tickers,
          marketDate
        },
        create: {
          slug: rankedEvent.id,
          title: rankedEvent.title,
          summary: rankedEvent.summary,
          sentiment: rankedEvent.sentiment,
          importanceScore: rankedEvent.importanceScore,
          sectors: rankedEvent.sectors,
          tickers: rankedEvent.tickers,
          marketDate
        }
      });

      await prisma.newsEventSource.deleteMany({
        where: {
          eventId: eventRecord.id
        }
      });

      await prisma.newsEventSource.createMany({
        data: candidate.rawItems.map((item) => ({
          eventId: eventRecord.id,
          rawNewsItemId: rawItemByUrl.get(item.url)!.id
        })),
        skipDuplicates: true
      });

      persistedEvents.push(eventRecord);
    }

    const generated = await aiClient.generateReport(reportEventInputs);
    const generatedReport = normalizeGeneratedReport(generated.report, reportEventInputs);
    const reportSlug = buildReportSlug(marketDate);

    const report = await prisma.dailyReport.upsert({
      where: {
        marketDate
      },
      update: {
        slug: reportSlug,
        title: generatedReport.title,
        summary: generatedReport.summary,
        contentZhEn: generatedReport.contentZhEn,
        sentimentSummary: generatedReport.sentimentSummary,
        sectorView: generatedReport.sectorView,
        tradingView: generatedReport.tradingView,
        riskWarning: generatedReport.riskWarning,
        disclaimer: generatedReport.disclaimer,
        status: "PUBLISHED",
        publishedAt: new Date()
      },
      create: {
        slug: reportSlug,
        marketDate,
        title: generatedReport.title,
        summary: generatedReport.summary,
        contentZhEn: generatedReport.contentZhEn,
        sentimentSummary: generatedReport.sentimentSummary,
        sectorView: generatedReport.sectorView,
        tradingView: generatedReport.tradingView,
        riskWarning: generatedReport.riskWarning,
        disclaimer: generatedReport.disclaimer,
        status: "PUBLISHED",
        publishedAt: new Date()
      }
    });

    await prisma.dailyReportEvent.deleteMany({
      where: {
        reportId: report.id
      }
    });

    await prisma.stockFocus.deleteMany({
      where: {
        reportId: report.id
      }
    });

    await prisma.dailyReportEvent.createMany({
      data: persistedEvents.map((event, index) => ({
        reportId: report.id,
        eventId: event.id,
        sortOrder: index + 1
      })),
      skipDuplicates: true
    });

    await prisma.stockFocus.createMany({
      data: generatedReport.stockFocuses.map((focus) => ({
        reportId: report.id,
        symbol: focus.symbol,
        company: focus.company,
        thesis: focus.thesis
      }))
    });

    const result = {
      status: "succeeded",
      marketDate: marketDate.toISOString(),
      rawItemsIngested: rawItems.length,
      eventsRanked: persistedEvents.length,
      reportId: report.id,
      reportSlug,
      sourceResults: ingestionResults.map((result) => ({
        sourceSlug: result.sourceSlug,
        mode: result.mode,
        itemCount: result.itemCount,
        errorMessage: result.errorMessage
      }))
    };

    await prisma.jobRun.update({
      where: {
        id: jobRunId
      },
      data: {
        status: "SUCCEEDED",
        triggerSource,
        aiProvider: runtimeConfig.provider,
        aiModel: runtimeConfig.model,
        reportSlug,
        promptTokens: generated.usage?.promptTokens,
        completionTokens: generated.usage?.completionTokens,
        totalTokens: generated.usage?.totalTokens,
        finishedAt: new Date(),
        message: `Daily pipeline completed for ${reportSlug}`,
        metadataJson: JSON.stringify(result)
      }
    });

    revalidatePath("/");
    revalidatePath("/archive");
    revalidatePath(`/reports/${reportSlug}`);
    revalidatePath(`/editions/${marketDate.toISOString().slice(0, 10)}`);
    revalidatePath("/search");

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown pipeline failure";

    await prisma.jobRun.update({
      where: {
        id: jobRunId
      },
      data: {
        status: "FAILED",
        triggerSource,
        aiProvider: runtimeConfig.provider,
        aiModel: runtimeConfig.model,
        finishedAt: new Date(),
        message,
        metadataJson: JSON.stringify({
          marketDate: marketDate.toISOString()
        })
      }
    });

    throw error;
  }
}

export async function runDailyPipeline(triggerSource = "SYSTEM") {
  const { jobRun, marketDate, runtimeConfig } = await createPipelineJobRun(triggerSource);

  return executeDailyPipelineJob({
    jobRunId: jobRun.id,
    marketDate,
    runtimeConfig,
    triggerSource
  });
}

export async function startDailyPipeline(triggerSource = "SYSTEM") {
  const { jobRun, marketDate, runtimeConfig } = await createPipelineJobRun(triggerSource);

  setTimeout(() => {
    void executeDailyPipelineJob({
      jobRunId: jobRun.id,
      marketDate,
      runtimeConfig,
      triggerSource
    }).catch((error) => {
      console.error("Background daily pipeline failed", error);
    });
  }, 0);

  return {
    jobId: jobRun.id
  };
}
