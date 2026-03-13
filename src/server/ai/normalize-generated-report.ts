import type { GeneratedReport, ReportEventInput } from "@/server/ai/types";

function toText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => toText(item))
      .filter(Boolean)
      .join("\n");
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${toText(item)}`)
      .filter((line) => !line.endsWith(": "))
      .join("\n");
  }

  return "";
}

export function normalizeGeneratedReport(
  report: Partial<GeneratedReport> | Record<string, unknown>,
  events: ReportEventInput[]
): GeneratedReport {
  const fallbackSymbols = Array.from(
    new Set(events.flatMap((event) => event.tickers).filter(Boolean))
  ).slice(0, 3);

  const stockFocuses = Array.isArray(report.stockFocuses)
    ? report.stockFocuses
        .map((focus) => {
          const value = focus as Record<string, unknown>;
          const symbol = toText(value.symbol).toUpperCase() || undefined;
          const company = toText(value.company) || undefined;
          const thesis = toText(value.thesis);

          if (!symbol || !thesis) {
            return null;
          }

          return {
            symbol,
            company,
            thesis
          };
        })
        .filter((focus): focus is NonNullable<typeof focus> => Boolean(focus))
        .slice(0, 3)
    : [];

  return {
    title: toText(report.title) || `Daily Market Brief | ${events[0]?.title ?? "Top Finance News"}`,
    summary: toText(report.summary) || `Generated from ${events.length} ranked events.`,
    contentZhEn:
      toText(report.contentZhEn) ||
      events
        .slice(0, 3)
        .map((event) => `${event.title}: ${event.summary}`)
        .join("\n\n"),
    sentimentSummary: toText(report.sentimentSummary) || "Market sentiment is mixed.",
    sectorView: toText(report.sectorView) || "Sector leadership remains mixed.",
    tradingView:
      toText(report.tradingView) || "Favor market- and sector-level positioning first.",
    stockFocuses:
      stockFocuses.length > 0
        ? stockFocuses
        : fallbackSymbols.map((symbol) => ({
            symbol,
            company: undefined,
            thesis: `${symbol} appears in the highest-ranked event set for this report.`
          })),
    riskWarning:
      toText(report.riskWarning) || "Market conditions can change quickly and without warning.",
    disclaimer:
      toText(report.disclaimer) || "This content is for informational purposes only."
  };
}
