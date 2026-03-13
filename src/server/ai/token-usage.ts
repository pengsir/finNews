import type { AiUsage, GeneratedReport } from "@/server/ai/types";

function estimateTokens(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return 0;
  }

  return Math.max(1, Math.ceil(normalized.length / 4));
}

export function estimateUsageFromText(promptText: string, completionText: string): AiUsage {
  const promptTokens = estimateTokens(promptText);
  const completionTokens = estimateTokens(completionText);

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens
  };
}

export function stringifyReportForUsage(report: GeneratedReport) {
  return JSON.stringify(report);
}
