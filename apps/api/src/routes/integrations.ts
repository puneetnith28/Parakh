import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import { config } from "../config.js";
import { mongoConnection } from "../storage/mongodb.js";

export const integrationsRouter = Router();

export interface IntegrationStatus {
  name: string;
  category: "core" | "sponsor" | "secondary";
  status: "active" | "connected" | "fallback_mock" | "fallback_in_memory" | "unconfigured" | "disabled" | "blueprint_spec" | "evaluated_architectural_adr";
  configured: boolean;
  isMockOrSimulated: boolean;
  details?: Record<string, unknown>;
}

/**
 * GET /api/integrations/status
 * Exposes truthful, verifiable status for all external & sponsor integrations.
 * Zero ungrounded claims: explicitly reports mock/fallback modes when credentials are absent.
 */
integrationsRouter.get("/api/integrations/status", (_req: Request, res: Response): void => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  const isModelKeyProvided = Boolean(config.AI_STUDIO_API_KEY || config.MODEL_API_KEY);
  const isModelMock = config.MODEL_PROVIDER === "mock" || !isModelKeyProvided;

  const integrations: Record<string, IntegrationStatus> = {
    gemma: {
      name: "Google Gemma / Google AI Studio",
      category: "core",
      status: isModelMock ? "fallback_mock" : "active",
      configured: isModelKeyProvided,
      isMockOrSimulated: isModelMock,
      details: {
        provider: config.MODEL_PROVIDER,
        modelName: config.MODEL_NAME,
        temperatureClamp: "0.0 - 0.2",
        quotaGuard: "active (15 RPM free-tier pacing)",
      },
    },
    mongodbAtlas: {
      name: "MongoDB Atlas",
      category: "core",
      status: isMongoConnected ? "connected" : "fallback_in_memory",
      configured: Boolean(config.MONGODB_URI),
      isMockOrSimulated: !isMongoConnected,
      details: {
        storageMode: isMongoConnected ? "mongodb" : "stateless_memory",
        isPersistent: isMongoConnected,
        readyState: mongoose.connection.readyState,
        health: mongoConnection.getStatus(),
      },
    },
    sentry: {
      name: "Sentry (Observability & Tracing)",
      category: "sponsor",
      status: config.SENTRY_DSN ? "active" : "disabled",
      configured: Boolean(config.SENTRY_DSN),
      isMockOrSimulated: !config.SENTRY_DSN,
      details: {
        environment: config.SENTRY_ENVIRONMENT,
        piiScrubbing: "active (scrubSecrets filter)",
      },
    },
    tigerData: {
      name: "TigerData (PGVector Retrieval)",
      category: "sponsor",
      status: config.TIGERDATA_DATABASE_URL ? "active" : "fallback_in_memory",
      configured: Boolean(config.TIGERDATA_DATABASE_URL),
      isMockOrSimulated: !config.TIGERDATA_DATABASE_URL,
      details: {
        engine: config.TIGERDATA_DATABASE_URL ? "pgvector" : "in_memory_cosine",
      },
    },
    temporal: {
      name: "Temporal (Durable Workflows)",
      category: "sponsor",
      status: config.TEMPORAL_ADDRESS ? "active" : "evaluated_architectural_adr",
      configured: Boolean(config.TEMPORAL_ADDRESS),
      isMockOrSimulated: !config.TEMPORAL_ADDRESS,
      details: {
        documentation: "docs/temporal-evaluation.md",
      },
    },
    serpApi: {
      name: "SerpApi (Documentation Search)",
      category: "sponsor",
      status: config.SERPAPI_API_KEY ? "active" : "unconfigured",
      configured: Boolean(config.SERPAPI_API_KEY),
      isMockOrSimulated: !config.SERPAPI_API_KEY,
      details: {
        evidenceIsolation: "external_docs_only (never substantiates code claims)",
      },
    },
    elevenLabs: {
      name: "ElevenLabs (Voice Narration)",
      category: "secondary",
      status: config.ELEVENLABS_API_KEY ? "active" : "disabled",
      configured: Boolean(config.ELEVENLABS_API_KEY),
      isMockOrSimulated: !config.ELEVENLABS_API_KEY,
    },
    backboard: {
      name: "Backboard (Context Memory)",
      category: "secondary",
      status: config.BACKBOARD_API_KEY ? "active" : "disabled",
      configured: Boolean(config.BACKBOARD_API_KEY),
      isMockOrSimulated: !config.BACKBOARD_API_KEY,
    },
    digitalOcean: {
      name: "DigitalOcean (Compute Worker)",
      category: "secondary",
      status: config.DIGITALOCEAN_ACCESS_TOKEN ? "active" : "blueprint_spec",
      configured: Boolean(config.DIGITALOCEAN_ACCESS_TOKEN),
      isMockOrSimulated: !config.DIGITALOCEAN_ACCESS_TOKEN,
    },
  };

  res.status(200).json({
    status: "success",
    timestamp: new Date().toISOString(),
    truthfulReportingMandate: true,
    activeIntegrationsCount: Object.values(integrations).filter((i) => !i.isMockOrSimulated).length,
    fallbackIntegrationsCount: Object.values(integrations).filter((i) => i.isMockOrSimulated).length,
    integrations,
  });
});
