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
  MODEL_NAME: z.string().default("gemma-2-9b-it"),
  MODEL_API_KEY: z.string().optional(),
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

  // Resource caps
  MAX_UPLOAD_MB: z.coerce.number().default(8),
  MAX_PDF_PAGES: z.coerce.number().default(40),
  MAX_REPOSITORY_FILES: z.coerce.number().default(150),
  MAX_FILE_BYTES: z.coerce.number().default(200000),
  MAX_ANALYSIS_REQUIREMENTS: z.coerce.number().default(40),
  ANALYSIS_TIMEOUT_SECONDS: z.coerce.number().default(120),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(rawEnv: Record<string, string | undefined> = process.env): AppConfig {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    throw new Error(`[Configuration Error] Invalid environment configuration: ${errorDetails}`);
  }
  return result.data;
}

export const config = loadConfig();
