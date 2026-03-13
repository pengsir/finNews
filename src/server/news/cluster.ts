import type { IngestedNewsItem } from "@/server/news/types";
import { decodeHtmlEntities } from "@/lib/text";

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "in",
  "into",
  "is",
  "its",
  "of",
  "on",
  "or",
  "says",
  "seen",
  "that",
  "the",
  "this",
  "to",
  "up",
  "us",
  "with"
]);

function normalizeText(value: string) {
  return decodeHtmlEntities(value)
    .toLowerCase()
    .replace(/'s\b/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeToken(token: string) {
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith("s") && token.length > 4 && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }

  return token;
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .map((token) => normalizeToken(token.replace(/^-+|-+$/g, "")))
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

const conceptPatterns: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "deepseek", patterns: [/\bdeepseek\b/, /\bai titan(s)?\b/, /\bai rout\b/] },
  { label: "oil", patterns: [/\boil\b/, /\bcrude\b/, /\bstrait of hormuz\b/, /\benergy market(s)?\b/] },
  { label: "fed-rates", patterns: [/\bfed\b/, /\brate cut(s)?\b/, /\byield(s)?\b/, /\btreasur(y|ies)\b/] },
  { label: "middle-east", patterns: [/\bmiddle east\b/, /\biran war\b/, /\biraq\b/, /\btanker(s)?\b/] },
  { label: "adobe", patterns: [/\badobe\b/] },
  { label: "netflix-ai", patterns: [/\bnetflix\b/, /\bben affleck\b/, /\bai startup\b/] },
  { label: "gold-silver", patterns: [/\bgold\b/, /\bsilver\b/, /\bcomex\b/] },
  { label: "natural-gas", patterns: [/\bnatural gas\b/, /\bpermian\b/, /\bgas firm\b/] },
  { label: "trade-tariff", patterns: [/\btariff\b/, /\bsection 301\b/, /\btrade practice(s)?\b/] },
  { label: "apac-war", patterns: [/\basia-pacific\b/, /\bprolonged war\b/] }
];

function extractConcepts(item: IngestedNewsItem) {
  const text = normalizeText(`${item.title} ${item.summary}`);
  const concepts = conceptPatterns
    .filter((concept) => concept.patterns.some((pattern) => pattern.test(text)))
    .map((concept) => concept.label);

  if (concepts.length > 0) {
    return concepts;
  }

  return tokenize(text).slice(0, 4);
}

function overlapCount(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((token) => rightSet.has(token)).length;
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : numerator / denominator;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export interface NewsCluster {
  clusterKey: string;
  rawItems: IngestedNewsItem[];
  concepts: string[];
}

function buildClusterKey(item: IngestedNewsItem) {
  const concepts = extractConcepts(item);
  const tokens = concepts.length > 0 ? concepts : tokenize(item.title).slice(0, 6);
  return tokens.length > 0 ? tokens.join("-") : item.eventKey;
}

function isSimilarToCluster(item: IngestedNewsItem, cluster: NewsCluster) {
  const itemTokens = tokenize(item.title);
  const itemConcepts = extractConcepts(item);

  return cluster.rawItems.some((existingItem) => {
    if (existingItem.eventKey === item.eventKey) {
      return true;
    }

    const existingTokens = tokenize(existingItem.title);
    const overlap = overlapCount(itemTokens, existingTokens);
    const jaccard = ratio(
      overlap,
      unique([...itemTokens, ...existingTokens]).length
    );
    const tickerOverlap = overlapCount(item.tickers, existingItem.tickers);
    const sectorOverlap = overlapCount(item.sectors, existingItem.sectors);
    const conceptOverlap = overlapCount(itemConcepts, cluster.concepts);

    return (
      conceptOverlap >= 1 ||
      jaccard >= 0.38 ||
      overlap >= 3 ||
      (overlap >= 2 && (tickerOverlap > 0 || sectorOverlap > 0))
    );
  });
}

export function clusterNewsItems(items: IngestedNewsItem[]) {
  const sortedItems = [...items].sort((left, right) => right.importanceHint - left.importanceHint);
  const clusters: NewsCluster[] = [];

  for (const item of sortedItems) {
    const matchedCluster = clusters.find((cluster) => isSimilarToCluster(item, cluster));

    if (matchedCluster) {
      matchedCluster.rawItems.push(item);
      matchedCluster.concepts = unique([
        ...matchedCluster.concepts,
        ...extractConcepts(item)
      ]);
      continue;
    }

    clusters.push({
      clusterKey: buildClusterKey(item),
      rawItems: [item],
      concepts: extractConcepts(item)
    });
  }

  return clusters;
}
