import { prisma } from "@/server/db/prisma";

export type AiProvider = "gemini" | "ollama" | "mock" | "openai-compatible";

export interface AiRuntimeConfig {
  provider: AiProvider;
  model: string;
  baseUrl: string;
  apiKey: string;
  ollamaTimeoutMs: number;
  ollamaKeepAlive: string;
  ollamaMaxReportEvents: number;
  ollamaMaxSourcesPerEvent: number;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getEnvRuntimeConfig(): AiRuntimeConfig {
  return {
    provider: (process.env.AI_PROVIDER ?? "mock") as AiProvider,
    model: process.env.AI_MODEL ?? "gemini-2.5-flash",
    baseUrl: process.env.AI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta",
    apiKey: process.env.AI_API_KEY ?? "",
    ollamaTimeoutMs: parsePositiveInteger(process.env.OLLAMA_TIMEOUT_MS, 120_000),
    ollamaKeepAlive: process.env.OLLAMA_KEEPALIVE ?? "5m",
    ollamaMaxReportEvents: parsePositiveInteger(process.env.OLLAMA_MAX_REPORT_EVENTS, 3),
    ollamaMaxSourcesPerEvent: parsePositiveInteger(process.env.OLLAMA_MAX_SOURCES_PER_EVENT, 1)
  };
}

export async function getAiRuntimeConfig(): Promise<AiRuntimeConfig> {
  const envConfig = getEnvRuntimeConfig();

  const activeConfig = await prisma.aiProviderConfig.findFirst({
    where: {
      isActive: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  if (!activeConfig) {
    throw new Error("No active AI configuration found in the database.");
  }

  return {
    ...envConfig,
    provider: activeConfig.provider as AiProvider,
    model: activeConfig.model,
    baseUrl: activeConfig.baseUrl,
    apiKey: activeConfig.apiKey ?? envConfig.apiKey
  };
}
