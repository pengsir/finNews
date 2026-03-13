import { getAiRuntimeConfig } from "@/server/ai/provider-config";
import { GeminiClient } from "@/server/ai/providers/gemini";
import { MockAiClient } from "@/server/ai/providers/mock";
import { OpenAiCompatibleClient } from "@/server/ai/providers/openai-compatible";
import { OllamaClient } from "@/server/ai/providers/ollama";
import type { AiClient } from "@/server/ai/types";

export async function getAiClient(): Promise<AiClient> {
  const config = await getAiRuntimeConfig();

  const factories: Record<string, () => AiClient> = {
    gemini: () =>
      new GeminiClient({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model
      }),
    ollama: () =>
      new OllamaClient({
        baseUrl: config.baseUrl,
        model: config.model,
        timeoutMs: config.ollamaTimeoutMs,
        keepAlive: config.ollamaKeepAlive,
        maxReportEvents: config.ollamaMaxReportEvents,
        maxSourcesPerEvent: config.ollamaMaxSourcesPerEvent
      }),
    mock: () => new MockAiClient(),
    "openai-compatible": () =>
      new OpenAiCompatibleClient({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model
      })
  };

  return (factories[config.provider] ?? factories.mock)();
}
