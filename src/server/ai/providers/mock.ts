import type {
  AiClient,
  GeneratedReportResult,
  RankedEventInput,
  ReportEventInput
} from "@/server/ai/types";
import {
  estimateUsageFromText,
  stringifyReportForUsage
} from "@/server/ai/token-usage";

export class MockAiClient implements AiClient {
  async scoreEvents(events: RankedEventInput[]) {
    return [...events].sort((left, right) => right.importanceScore - left.importanceScore);
  }

  async generateReport(events: ReportEventInput[]): Promise<GeneratedReportResult> {
    const topEvents = events.slice(0, 5);
    const leadEvents = topEvents.slice(0, 3);
    const sectorLabels = Array.from(new Set(topEvents.flatMap((event) => event.sectors)));
    const focusSymbols = Array.from(new Set(topEvents.flatMap((event) => event.tickers))).slice(0, 3);
    const evidenceLines = topEvents.flatMap((event) =>
      event.sources.slice(0, 2).map((source) => {
        return `- ${event.title} | ${source.sourceName}: ${source.title}`;
      })
    );
    const eventNarratives = topEvents.map((event, index) => {
      const sourceNames = Array.from(
        new Set(event.sources.map((source) => source.sourceName))
      ).join(", ");

      return {
        english: `${index + 1}. ${event.title}: ${event.summary} Coverage was observed across ${sourceNames || `${event.sourceCount} source items`}.`,
        chinese: `${index + 1}. ${event.title}：${event.summary}，当前证据链主要来自 ${sourceNames || `${event.sourceCount} 个来源`}。`
      };
    });

    const report = {
        title: `Daily Market Brief | ${leadEvents.map((event) => event.title).slice(0, 2).join(" + ")}`,
        summary: `Generated from ${events.length} ranked events led by ${topEvents
          .map((event) => event.title)
          .join(", ")}.`,
        contentZhEn: [
          `EN: The pre-market setup is being led by ${leadEvents.map((event) => event.title).join(", ")}.`,
          `EN: Sector leadership currently clusters around ${sectorLabels.join(", ") || "broad market themes"}, while the most visible tickers are ${focusSymbols.join(", ") || "major index proxies"}.`,
          ...eventNarratives.map((item) => item.english),
          "EN: Evidence trail used for this draft:",
          ...evidenceLines,
          `ZH: 当前盘前市场的主要驱动因素包括${leadEvents.map((event) => event.title).join("、")}。`,
          `ZH: 板块主线集中在${sectorLabels.join("、") || "宏观与大盘主题"}，需要重点观察的股票或ETF包括${focusSymbols.join("、") || "主要指数工具"}。`,
          ...eventNarratives.map((item) => item.chinese)
        ].join("\n\n"),
        sentimentSummary: `Overall tone is ${leadEvents[0]?.sentiment ?? "neutral"}, but conviction is strongest in stories with multi-source confirmation and recurring cross-market themes.`,
        sectorView: `Top sectors in the current run: ${sectorLabels.join(", ") || "Macro"}.`,
        tradingView:
          `Favor market- and sector-level positioning first. The current draft is based on ${events.length} ranked events and ${events.reduce((sum, event) => sum + event.sources.length, 0)} cited source items.`,
        stockFocuses: focusSymbols.map((symbol) => ({
          symbol,
          company: undefined,
          thesis: `${symbol} is appearing repeatedly in the strongest ranked event set for the current session.`
        })),
        riskWarning: "Market conditions can change quickly.",
        disclaimer: "This content is for informational purposes only."
      };

    return {
      report,
      usage: estimateUsageFromText(
        JSON.stringify(events),
        stringifyReportForUsage(report)
      )
    };
  }
}
