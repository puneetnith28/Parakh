import { z } from "zod";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

// Load environment variables from cwd or parent directories in monorepo
dotenv.config();
const candidateEnvPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
  path.resolve(process.cwd(), "../../.env"),
];
for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  API_BASE_URL: z.string().url().default("http://localhost:3000"),
  ANALYSIS_RATE_LIMIT_MAX: z.coerce.number().default(10),
  ANALYSIS_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(3600000), // 1 hour

  // Model provider
  MODEL_PROVIDER: z.string().default("google"),
  GEMMA_MODEL_ID: z.string().optional(),
  MODEL_NAME: z.string().default("gemini-3.8-flash"),
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

export function getModelFamily(modelName: string): "gemma" | "gemini" | "other" {
  const lower = modelName.toLowerCase();
  if (lower.startsWith("gemma") || lower.includes("gemma")) return "gemma";
  if (lower.startsWith("gemini") || lower.includes("gemini")) return "gemini";
  return "other";
}

export function isGemmaModel(modelName: string): boolean {
  return getModelFamily(modelName) === "gemma";
}

export function loadConfig(rawEnv: Record<string, string | undefined> = process.env): AppConfig {
  const normalized = { ...rawEnv };
  if (!normalized.MODEL_API_KEY && normalized.AI_STUDIO_API_KEY) {
    normalized.MODEL_API_KEY = normalized.AI_STUDIO_API_KEY;
  }
  if (!normalized.MODEL_NAME && normalized.GEMMA_MODEL_ID) {
    normalized.MODEL_NAME = normalized.GEMMA_MODEL_ID;
  }
  if (
    normalized.WEB_ORIGIN &&
    !normalized.WEB_ORIGIN.startsWith("http://") &&
    !normalized.WEB_ORIGIN.startsWith("https://")
  ) {
    normalized.WEB_ORIGIN = `https://${normalized.WEB_ORIGIN}`;
  }
  if (
    normalized.FRONTEND_URL &&
    !normalized.FRONTEND_URL.startsWith("http://") &&
    !normalized.FRONTEND_URL.startsWith("https://")
  ) {
    normalized.FRONTEND_URL = `https://${normalized.FRONTEND_URL}`;
  }
  const result = envSchema.safeParse(normalized);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    throw new Error(`[Configuration Error] Invalid environment configuration: ${errorDetails}`);
  }

  const SUPPORTED_PROVIDERS = ["google", "google-ai", "huggingface", "ollama", "mock", "gemini", "openai"];
  if (!SUPPORTED_PROVIDERS.includes(result.data.MODEL_PROVIDER.toLowerCase())) {
    throw new Error(
      `[Configuration Error] Unsupported MODEL_PROVIDER '${result.data.MODEL_PROVIDER}'. Supported providers are: ${SUPPORTED_PROVIDERS.join(", ")}`
    );
  }

  // In production, do not silently present mock mode or run without credentials
  if (
    result.data.NODE_ENV === "production" &&
    result.data.MODEL_PROVIDER !== "mock" &&
    !result.data.MODEL_API_KEY
  ) {
    throw new Error(
      "[Configuration Error] In production mode, MODEL_API_KEY (or AI_STUDIO_API_KEY) is required when MODEL_PROVIDER is not explicitly set to 'mock'."
    );
  }

  return result.data;
}

export const config = loadConfig();

export function validateConfigAtStartup(cfg: AppConfig = config): void {
  console.log(
    `[Parakh Config] Resource Caps: Max Files=${cfg.MAX_REPOSITORY_FILES}, Max File Bytes=${cfg.MAX_FILE_BYTES}, Max Upload=${cfg.MAX_UPLOAD_MB}MB, Max Pages=${cfg.MAX_PDF_PAGES}`
  );
  if (cfg.MODEL_PROVIDER === "mock") {
    console.warn(`[Parakh Config] Explicit Mock Provider Mode (provider: mock, model: ${cfg.MODEL_NAME}). Simulated responses will be returned.`);
  } else if (!cfg.MODEL_API_KEY && !cfg.AI_STUDIO_API_KEY) {
    console.warn(`[Parakh Config] Notice: No API key detected. Running in Fallback Mode (model: ${cfg.MODEL_NAME}).`);
  } else {
    console.log(`[Parakh Config] Model Provider: ${cfg.MODEL_PROVIDER} (${cfg.MODEL_NAME})`);
  }
  if (!cfg.MONGODB_URI) {
    console.warn("[Parakh Config] Warning: MONGODB_URI not provided. Running with In-Memory fallback storage.");
  } else {
    console.log("[Parakh Config] MongoDB Atlas URI configured.");
  }
}

