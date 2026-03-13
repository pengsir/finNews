import type { NewsSource } from "@prisma/client";
import { getMockEventsForSource } from "@/server/news/mock-source-catalog";
import { inferImportance, inferSectors, inferSentiment, inferTickers } from "@/server/news/infer";
import { ingestRssSource } from "@/server/news/rss";
import type { IngestedNewsItem, SourceIngestionResult } from "@/server/news/types";

function buildTimestamp(marketDate: Date, offsetMinutes: number) {
  return new Date(marketDate.getTime() + offsetMinutes * 60_000);
}

function buildFallbackItem(source: NewsSource, marketDate: Date) {
  const dayKey = marketDate.toISOString().slice(0, 10);

  return async () => {
    const eventSeeds = getMockEventsForSource(source.slug);

    return eventSeeds.map<IngestedNewsItem>((event, index) => {
      const publishTime = buildTimestamp(marketDate, index * 11 + 15);
      const analysisText = `${event.title} ${event.summary}`;

      return {
        sourceId: source.id,
        sourceSlug: source.slug,
        externalId: `${source.slug}-${event.eventKey}-${dayKey}`,
        title: event.title,
        url: `https://example.com/${source.slug}/${event.eventKey}/${dayKey}`,
        language: "en",
        publishedAt: publishTime,
        summary: event.summary,
        content: `${event.summary} Coverage synthesized for ${source.name}.`,
        eventKey: event.eventKey,
        sectors: event.sectors.length > 0 ? event.sectors : inferSectors(analysisText),
        tickers: event.tickers.length > 0 ? event.tickers : inferTickers(analysisText),
        sentiment: event.sentiment || inferSentiment(analysisText),
        importanceHint: event.importanceHint ?? inferImportance(analysisText, source.weight)
      };
    });
  };
}

export async function ingestSource(source: NewsSource, marketDate: Date) {
  const fallback = buildFallbackItem(source, marketDate);

  if (source.sourceType === "rss") {
    try {
      const liveItems = await ingestRssSource(source, marketDate);

      if (liveItems.length > 0) {
        return {
          sourceId: source.id,
          sourceSlug: source.slug,
          mode: "live",
          itemCount: liveItems.length,
          items: liveItems
        } satisfies SourceIngestionResult;
      }
    } catch (error) {
      console.warn(`Falling back to mock ingestion for ${source.slug}:`, error);

      const fallbackItems = await fallback();

      return {
        sourceId: source.id,
        sourceSlug: source.slug,
        mode: "fallback",
        itemCount: fallbackItems.length,
        errorMessage: error instanceof Error ? error.message : "Unknown RSS ingestion error",
        items: fallbackItems
      } satisfies SourceIngestionResult;
    }
  }

  const fallbackItems = await fallback();

  return {
    sourceId: source.id,
    sourceSlug: source.slug,
    mode: "fallback",
    itemCount: fallbackItems.length,
    items: fallbackItems
  } satisfies SourceIngestionResult;
}

export async function ingestSources(sources: NewsSource[], marketDate: Date) {
  return Promise.all(sources.map((source) => ingestSource(source, marketDate)));
}
