import type { NewsSource } from "@prisma/client";
import { Agent } from "undici";
import { XMLParser } from "fast-xml-parser";
import { decodeHtmlEntities } from "@/lib/text";
import {
  inferImportance,
  inferSectors,
  inferSentiment,
  inferTickers,
  isMarketRelevant
} from "@/server/news/infer";
import type { IngestedNewsItem } from "@/server/news/types";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
  trimValues: true
});

const insecureDispatcher = new Agent({
  connect: {
    rejectUnauthorized: false
  }
});
const rssTimeoutMs = 15_000;

function shouldRetryWithInsecureTls(error: unknown) {
  if (process.env.RSS_ALLOW_INSECURE_TLS !== "true") {
    return false;
  }

  return (
    error instanceof Error &&
    "cause" in error &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    "code" in error.cause &&
    error.cause.code === "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"
  );
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toArray<T>(value: T | T[] | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function parsePublicationDate(value: unknown, fallback: Date) {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function getTitle(item: Record<string, unknown>) {
  return typeof item.title === "string" ? stripHtml(item.title) : "Untitled finance story";
}

function getLink(item: Record<string, unknown>) {
  if (typeof item.link === "string") {
    return item.link;
  }

  if (typeof item.guid === "string") {
    return item.guid;
  }

  if (typeof item.id === "string") {
    return item.id;
  }

  return "";
}

function getSummary(item: Record<string, unknown>) {
  const candidates = [
    item.description,
    item.summary,
    item.encoded,
    item.content
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const cleaned = stripHtml(candidate);

      if (cleaned) {
        return cleaned;
      }
    }
  }

  return "";
}

function readRssItems(parsed: Record<string, unknown>) {
  const rssChannel = parsed.rss as { channel?: { item?: unknown } } | undefined;
  const atomFeed = parsed.feed as { entry?: unknown } | undefined;

  return toArray<Record<string, unknown>>(
    rssChannel?.channel?.item as Record<string, unknown>[] | Record<string, unknown> | undefined
  ).concat(
    toArray<Record<string, unknown>>(
      atomFeed?.entry as Record<string, unknown>[] | Record<string, unknown> | undefined
    )
  );
}

export async function ingestRssSource(source: NewsSource, marketDate: Date) {
  const requestInit = {
    headers: {
      "user-agent": "FinNewsBot/0.1 (+local development)"
    },
    cache: "no-store"
  } as RequestInit & {
    dispatcher?: Agent;
  };

  let response: Response;

  try {
    response = await fetch(source.feedUrl, {
      ...requestInit,
      signal: AbortSignal.timeout(rssTimeoutMs)
    });
  } catch (error) {
    if (!shouldRetryWithInsecureTls(error)) {
      throw error;
    }

    const retryRequestInit = {
      ...requestInit,
      signal: AbortSignal.timeout(rssTimeoutMs),
      dispatcher: insecureDispatcher
    } as RequestInit & {
      dispatcher?: Agent;
    };

    response = await fetch(source.feedUrl, retryRequestInit);
  }

  if (!response.ok) {
    throw new Error(`RSS fetch failed for ${source.slug}: ${response.status}`);
  }

  const xml = await response.text();
  const parsed = xmlParser.parse(xml) as Record<string, unknown>;
  const entries = readRssItems(parsed).slice(0, 10);

  return entries
    .map<IngestedNewsItem | null>((entry, index) => {
      const title = getTitle(entry);
      const url = getLink(entry);
      const summary = getSummary(entry) || title;

      if (!url) {
        return null;
      }

      const analysisText = `${title} ${summary}`;
      if (!isMarketRelevant(analysisText)) {
        return null;
      }

      const publishedAt = parsePublicationDate(
        entry.pubDate ?? entry.published ?? entry.updated,
        new Date(marketDate.getTime() + index * 300_000)
      );

      return {
        sourceId: source.id,
        sourceSlug: source.slug,
        externalId:
          typeof entry.guid === "string" ? entry.guid : `${source.slug}-${slugify(title)}`,
        title,
        url,
        language: "en",
        publishedAt,
        summary,
        content: summary,
        eventKey: slugify(title),
        sectors: inferSectors(analysisText),
        tickers: inferTickers(analysisText),
        sentiment: inferSentiment(analysisText),
        importanceHint: inferImportance(analysisText, source.weight)
      };
    })
    .filter((item): item is IngestedNewsItem => Boolean(item));
}
