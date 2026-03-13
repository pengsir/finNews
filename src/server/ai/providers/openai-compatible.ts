import type {
  AiClient,
  GeneratedReportResult,
  RankedEventInput,
  ReportEventInput
} from "@/server/ai/types";
import { MockAiClient } from "@/server/ai/providers/mock";
import { estimateUsageFromText, stringifyReportForUsage } from "@/server/ai/token-usage";

interface OpenAiCompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class OpenAiCompatibleClient implements AiClient {
  constructor(private readonly config: OpenAiCompatibleConfig) {}

  async scoreEvents(events: RankedEventInput[]) {
    return [...events].sort((left, right) => right.importanceScore - left.importanceScore);
  }

  async generateReport(events: ReportEventInput[]): Promise<GeneratedReportResult> {
    if (!this.config.baseUrl || !this.config.model) {
      throw new Error("OpenAI-compatible provider is missing base URL or model.");
    }

    const fallback = await new MockAiClient().generateReport(events);

    return {
      report: fallback.report,
      usage:
        fallback.usage ??
        estimateUsageFromText(
          JSON.stringify({
            provider: this.config.model,
            events
          }),
          stringifyReportForUsage(fallback.report)
        )
    };
  }
}
