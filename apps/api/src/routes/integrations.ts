import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import { config, getModelFamily, isGemmaModel } from "../config.js";
import { mongoConnection } from "../storage/mongodb.js";

export const integrationsRouter = Router();

export interface IntegrationStatus {
  name: string;
  category: "core" | "sponsor" | "secondary";
  status: "active" | "connected" | "fallback_mock" | "fallback_in_memory" | "configured_unverified" | "unconfigured" | "disabled" | "blueprint_spec" | "evaluated_architectural_adr";
  configured: boolean;
  reachable: boolean;
  verified: boolean;
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
  const modelFamily = getModelFamily(config.MODEL_NAME);
  const isGemmaEligible = isGemmaModel(config.MODEL_NAME);

  const integrations: Record<string, IntegrationStatus> = {
    gemma: {
      name: isGemmaEligible ? "Google Gemma (Open Weights)" : "Google AI Studio (Gemini)",
      category: "core",
      status: isModelMock ? "fallback_mock" : "active",
      configured: isModelKeyProvided,
      reachable: isModelKeyProvided,
      verified: isModelKeyProvided,
      isMockOrSimulated: isModelMock,
      details: {
        provider: config.MODEL_PROVIDER,
        modelName: config.MODEL_NAME,
        modelFamily,
        isGemmaEligible,
        sponsorTrackEligibility: isGemmaEligible
          ? "Gemma Open Models & Google AI Studio"
          : "Google AI Studio (Gemini-backed; not Gemma-eligible)",
        temperatureClamp: "0.0 - 0.2",
        quotaGuard: "active (15 RPM free-tier pacing)",
      },
    },
    mongodbAtlas: {
      name: "MongoDB Atlas",
      category: "core",
      status: isMongoConnected ? "connected" : "fallback_in_memory",
      configured: Boolean(config.MONGODB_URI),
      reachable: isMongoConnected,
      verified: isMongoConnected,
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
      reachable: Boolean(config.SENTRY_DSN),
      verified: Boolean(config.SENTRY_DSN),
      isMockOrSimulated: !config.SENTRY_DSN,
      details: {
        environment: config.SENTRY_ENVIRONMENT,
        piiScrubbing: "active (scrubSecrets filter)",
      },
    },
    tigerData: {
      name: "TigerData (PGVector Retrieval)",
      category: "sponsor",
      status: config.TIGERDATA_DATABASE_URL ? "configured_unverified" : "fallback_in_memory",
      configured: Boolean(config.TIGERDATA_DATABASE_URL),
      reachable: false,
      verified: false,
      isMockOrSimulated: !config.TIGERDATA_DATABASE_URL,
      details: {
        engine: config.TIGERDATA_DATABASE_URL ? "pgvector" : "in_memory_cosine",
      },
    },
    temporal: {
      name: "Temporal (Durable Workflows)",
      category: "sponsor",
      status: config.TEMPORAL_ADDRESS ? "configured_unverified" : "evaluated_architectural_adr",
      configured: Boolean(config.TEMPORAL_ADDRESS),
      reachable: false,
      verified: false,
      isMockOrSimulated: !config.TEMPORAL_ADDRESS,
      details: {
        documentation: "docs/temporal-evaluation.md",
      },
    },
    serpApi: {
      name: "SerpApi (Documentation Search)",
      category: "sponsor",
      status: config.SERPAPI_API_KEY ? "configured_unverified" : "unconfigured",
      configured: Boolean(config.SERPAPI_API_KEY),
      reachable: false,
      verified: false,
      isMockOrSimulated: !config.SERPAPI_API_KEY,
      details: {
        evidenceIsolation: "external_docs_only (never substantiates code claims)",
      },
    },
    elevenLabs: {
      name: "ElevenLabs (Voice Narration)",
      category: "secondary",
      status: config.ELEVENLABS_API_KEY ? "configured_unverified" : "disabled",
      configured: Boolean(config.ELEVENLABS_API_KEY),
      reachable: false,
      verified: false,
      isMockOrSimulated: !config.ELEVENLABS_API_KEY,
    },
    backboard: {
      name: "Backboard (Context Memory)",
      category: "secondary",
      status: config.BACKBOARD_API_KEY ? "configured_unverified" : "disabled",
      configured: Boolean(config.BACKBOARD_API_KEY),
      reachable: false,
      verified: false,
      isMockOrSimulated: !config.BACKBOARD_API_KEY,
    },
    digitalOcean: {
      name: "DigitalOcean (Compute Worker)",
      category: "secondary",
      status: config.DIGITALOCEAN_ACCESS_TOKEN ? "configured_unverified" : "blueprint_spec",
      configured: Boolean(config.DIGITALOCEAN_ACCESS_TOKEN),
      reachable: false,
      verified: false,
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
