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

function buildConclusionLines(events: ReportEventInput[]) {
  const topEvents = events.slice(0, 3);
  const leadSectors = Array.from(
    new Set(topEvents.flatMap((event) => event.sectors).filter(Boolean))
  ).slice(0, 3);
  const leadTickers = Array.from(
    new Set(topEvents.flatMap((event) => event.tickers).filter(Boolean))
  ).slice(0, 3);

  const lines = [
    topEvents[0]
      ? `- 当前盘前主线集中在“${topEvents[0].title}”，开盘方向先看这条线是否继续强化。`
      : "- 当前盘前主线仍在快速变化，优先观察开盘后的第一波资金选择。",
    leadSectors.length > 0
      ? `- 重点跟踪${leadSectors.join("、")}板块的强弱切换，它们决定市场风险偏好的扩散程度。`
      : "- 重点先看核心板块的强弱切换，再决定是否扩大到更分散的交易方向。",
    leadTickers.length > 0
      ? `- ${leadTickers.join("、")}等高关注标的若不能企稳，指数层面的反弹持续性也会受限。`
      : "- 若核心高弹性标的无法企稳，指数层面的反弹持续性也会受到质疑。"
  ];

  return lines.filter(Boolean);
}

function ensureConclusionSection(content: string, events: ReportEventInput[]) {
  if (!content.trim()) {
    return content;
  }

  if (content.includes("ZH: 结论")) {
    return content;
  }

  const evidenceMarker = "EN: Evidence trail used for this draft:";
  const conclusionBlock = ["ZH: 结论", ...buildConclusionLines(events)].join("\n");

  if (content.includes(evidenceMarker)) {
    const [beforeEvidence, afterEvidence] = content.split(evidenceMarker, 2);
    return `${beforeEvidence.trim()}\n\n${conclusionBlock}\n\n${evidenceMarker}\n${afterEvidence.trim()}`;
  }

  return `${content.trim()}\n\n${conclusionBlock}`;
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

  const rawContent =
    toText(report.contentZhEn) ||
    events
      .slice(0, 3)
      .map((event) => `${event.title}: ${event.summary}`)
      .join("\n\n");

  return {
    title: toText(report.title) || `Daily Market Brief | ${events[0]?.title ?? "Top Finance News"}`,
    summary: toText(report.summary) || `Generated from ${events.length} ranked events.`,
    contentZhEn: ensureConclusionSection(rawContent, events),
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
