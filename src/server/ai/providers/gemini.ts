import { MockAiClient } from "@/server/ai/providers/mock";
import type {
  AiClient,
  GeneratedReport,
  GeneratedReportResult,
  RankedEventInput,
  ReportEventInput
} from "@/server/ai/types";
import {
  estimateUsageFromText,
  stringifyReportForUsage
} from "@/server/ai/token-usage";

interface GeminiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface GeminiGenerateContentResponse {
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

function extractJsonText(value: string) {
  const cleaned = value.trim();
  const fencedMatch = cleaned.match(/```json\s*([\s\S]*?)```/i);

  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  const startCandidates = [firstBrace, firstBracket].filter((index) => index >= 0);

  if (startCandidates.length === 0) {
    return cleaned;
  }

  const start = Math.min(...startCandidates);
  const lastBrace = cleaned.lastIndexOf("}");
  const lastBracket = cleaned.lastIndexOf("]");
  const end = Math.max(lastBrace, lastBracket);

  if (end > start) {
    return cleaned.slice(start, end + 1);
  }

  return cleaned.slice(start);
}

export class GeminiClient implements AiClient {
  constructor(private readonly config: GeminiConfig) {}

  private async generateJson<T>(system: string, user: string) {
    const endpoint = `${this.config.baseUrl.replace(/\/$/, "")}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [system, "", user].join("\n")
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.6
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed with ${response.status} ${response.statusText}.`);
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse;
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return {
      data: JSON.parse(extractJsonText(text)) as T,
      usage: {
        promptTokens: payload.usageMetadata?.promptTokenCount,
        completionTokens: payload.usageMetadata?.candidatesTokenCount,
        totalTokens: payload.usageMetadata?.totalTokenCount
      }
    };
  }

  async scoreEvents(events: RankedEventInput[]) {
    return [...events].sort((left, right) => right.importanceScore - left.importanceScore);
  }

  async generateReport(events: ReportEventInput[]): Promise<GeneratedReportResult> {
    if (!this.config.apiKey) {
      return new MockAiClient().generateReport(events);
    }

    const compactEvents = events.slice(0, 8).map((event) => ({
      title: event.title,
      summary: event.summary,
      sentiment: event.sentiment,
      sectors: event.sectors,
      tickers: event.tickers,
      sourceCount: event.sourceCount,
      sources: event.sources.slice(0, 3)
    }));

    const result = await this.generateJson<GeneratedReport>(
      [
        "Return strict JSON only.",
        "You are writing a bilingual pre-market finance morning note.",
        "Required JSON keys: title, summary, contentZhEn, sentimentSummary, sectorView, tradingView, stockFocuses, riskWarning, disclaimer.",
        "contentZhEn must include these exact section markers in order: 'EN: Morning Note', 'ZH: 盘前晨报', 'ZH: 结论', 'EN: Evidence trail used for this draft:'.",
        "The Chinese section should read like a professional morning column, not a bullet list or outline.",
        "Target roughly 900 to 1200 Chinese characters before the conclusions and evidence trail.",
        "Under 'ZH: 结论', provide 3 to 5 short bullet lines starting with '- ' in a decisive, conclusion-style tone.",
        "Use only the provided events and sources.",
        "stockFocuses must be an array of at most 3 objects with keys symbol, company, thesis."
      ].join(" "),
      [
        "Generate the daily pre-market report from these ranked events and sources.",
        JSON.stringify(compactEvents, null, 2)
      ].join("\n\n")
    );

    return {
      report: result.data,
      usage:
        result.usage.totalTokens || result.usage.promptTokens || result.usage.completionTokens
          ? result.usage
          : estimateUsageFromText(
              JSON.stringify(compactEvents),
              stringifyReportForUsage(result.data)
            )
    };
  }
}
