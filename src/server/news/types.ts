export interface IngestedNewsItem {
  sourceId: string;
  sourceSlug: string;
  externalId: string;
  title: string;
  url: string;
  language: string;
  publishedAt: Date;
  summary: string;
  content: string;
  eventKey: string;
  sectors: string[];
  tickers: string[];
  sentiment: string;
  importanceHint: number;
}

export interface SourceIngestionResult {
  sourceId: string;
  sourceSlug: string;
  mode: "live" | "fallback";
  itemCount: number;
  errorMessage?: string;
  items: IngestedNewsItem[];
}

export interface EventCandidate {
  eventKey: string;
  title: string;
  summary: string;
  sectors: string[];
  tickers: string[];
  sentiment: string;
  importanceScore: number;
  rawItems: IngestedNewsItem[];
}
