import type { NewsSource } from "@prisma/client";
import { clusterNewsItems } from "@/server/news/cluster";
import type { EventCandidate, IngestedNewsItem } from "@/server/news/types";

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildEventCandidates(
  items: IngestedNewsItem[],
  sourceMap: Map<string, NewsSource>
) {
  return clusterNewsItems(items)
    .map<EventCandidate>((cluster) => {
      const primary = [...cluster.rawItems].sort(
        (left, right) => right.importanceHint - left.importanceHint
      )[0];
      const eventKey = cluster.clusterKey;
      const sourceWeight = cluster.rawItems.reduce((sum, item) => {
        return sum + (sourceMap.get(item.sourceId)?.weight ?? 1);
      }, 0);

      const importanceScore = Number(
        (
          average(cluster.rawItems.map((item) => item.importanceHint)) +
          sourceWeight * 0.6 +
          Math.min(cluster.rawItems.length * 0.35, 1.2)
        ).toFixed(2)
      );

      return {
        eventKey,
        title: primary.title,
        summary: primary.summary,
        sectors: uniqueStrings(cluster.rawItems.flatMap((item) => item.sectors)),
        tickers: uniqueStrings(cluster.rawItems.flatMap((item) => item.tickers)),
        sentiment: primary.sentiment,
        importanceScore,
        rawItems: cluster.rawItems
      };
    })
    .sort((left, right) => right.importanceScore - left.importanceScore);
}
