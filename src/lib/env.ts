import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  AI_PROVIDER: z.enum(["gemini", "ollama", "mock", "openai-compatible"]).optional(),
  AI_BASE_URL: z.string().url().optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  ADMIN_USERNAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_SESSION_SECRET: z.string().optional(),
  OLLAMA_TIMEOUT_MS: z.string().optional(),
  OLLAMA_KEEPALIVE: z.string().optional(),
  OLLAMA_MAX_REPORT_EVENTS: z.string().optional(),
  OLLAMA_MAX_SOURCES_PER_EVENT: z.string().optional(),
  CRON_SECRET: z.string().min(1)
});

export const env = envSchema.safeParse(process.env);
