export interface RankedEventInput {
  id: string;
  title: string;
  summary: string;
  sourceCount: number;
  sectors: string[];
  tickers: string[];
  importanceScore: number;
  sentiment: string;
}

export interface ReportSourceInput {
  sourceSlug: string;
  sourceName: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
}

export interface ReportEventInput extends RankedEventInput {
  sources: ReportSourceInput[];
}

export interface GeneratedReport {
  title: string;
  summary: string;
  contentZhEn: string;
  sentimentSummary: string;
  sectorView: string;
  tradingView: string;
  stockFocuses: Array<{
    symbol: string;
    company?: string;
    thesis: string;
  }>;
  riskWarning: string;
  disclaimer: string;
}

export interface AiUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface GeneratedReportResult {
  report: GeneratedReport;
  usage?: AiUsage;
}

export interface AiClient {
  scoreEvents(events: RankedEventInput[]): Promise<RankedEventInput[]>;
  generateReport(events: ReportEventInput[]): Promise<GeneratedReportResult>;
}
