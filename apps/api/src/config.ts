import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  API_BASE_URL: z.string().url().default("http://localhost:3000"),

  // Model provider
  MODEL_PROVIDER: z.string().default("google"),
  MODEL_NAME: z.string().default("gemini-3.5-flash-lite"),
  MODEL_API_KEY: z.string().optional(),
  AI_STUDIO_API_KEY: z.string().optional(),
  MODEL_BASE_URL: z.string().url().optional(),

  // GitHub access
  GITHUB_TOKEN: z.string().optional(),

  // MongoDB Atlas
  MONGODB_URI: z.string().optional(),
  MONGODB_DATABASE: z.string().default("parakh"),

  // Sentry
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default("development"),

  // Tiger Data
  TIGERDATA_DATABASE_URL: z.string().optional(),

  // Temporal Workflow Engine (Phase 8 - Optional)
  TEMPORAL_ADDRESS: z.string().optional(),
  TEMPORAL_NAMESPACE: z.string().optional(),
  TEMPORAL_API_KEY: z.string().optional(),

  // SerpApi Search (Phase 8 - Optional)
  SERPAPI_API_KEY: z.string().optional(),

  // Backboard Developer Memory (Phase 8 - Optional)
  BACKBOARD_API_KEY: z.string().optional(),

  // ElevenLabs Audio Narration (Phase 8 - Optional)
  ELEVENLABS_API_KEY: z.string().optional(),

  // DigitalOcean Worker (Phase 8 - Optional)
  DIGITALOCEAN_ACCESS_TOKEN: z.string().optional(),

  // Resource caps
  MAX_UPLOAD_MB: z.coerce.number().default(10),
  MAX_PDF_PAGES: z.coerce.number().default(30),
  MAX_REPOSITORY_FILES: z.coerce.number().default(200),
  MAX_FILE_BYTES: z.coerce.number().default(256 * 1024),
  MAX_ANALYSIS_REQUIREMENTS: z.coerce.number().default(40),
  ANALYSIS_TIMEOUT_SECONDS: z.coerce.number().default(120),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(rawEnv: Record<string, string | undefined> = process.env): AppConfig {
  const normalized = { ...rawEnv };
  if (!normalized.MODEL_API_KEY && normalized.AI_STUDIO_API_KEY) {
    normalized.MODEL_API_KEY = normalized.AI_STUDIO_API_KEY;
  }
  const result = envSchema.safeParse(normalized);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    throw new Error(`[Configuration Error] Invalid environment configuration: ${errorDetails}`);
  }
  return result.data;
}

export const config = loadConfig();

export function validateConfigAtStartup(cfg: AppConfig = config): void {
  console.log(
    `[Parakh Config] Resource Caps: Max Files=${cfg.MAX_REPOSITORY_FILES}, Max File Bytes=${cfg.MAX_FILE_BYTES}, Max Upload=${cfg.MAX_UPLOAD_MB}MB, Max Pages=${cfg.MAX_PDF_PAGES}`
  );
  if (cfg.MODEL_PROVIDER === "mock" || (!cfg.MODEL_API_KEY && !cfg.AI_STUDIO_API_KEY)) {
    console.warn(`[Parakh Config] Notice: Running in Mock Provider Mode (provider: mock, model: ${cfg.MODEL_NAME}). Simulated responses will be returned.`);
  } else {
    console.log(`[Parakh Config] Model Provider: ${cfg.MODEL_PROVIDER} (${cfg.MODEL_NAME})`);
  }
  if (!cfg.MONGODB_URI) {
    console.warn("[Parakh Config] Warning: MONGODB_URI not provided. Running with In-Memory fallback storage.");
  } else {
    console.log("[Parakh Config] MongoDB Atlas URI configured.");
  }
}

