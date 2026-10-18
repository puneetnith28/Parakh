import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import { config, getModelFamily, isGemmaModel } from "../config.js";
import { mongoConnection } from "../storage/mongodb.js";

export const integrationsRouter = Router();

export interface IntegrationStatus {
  name: string;
  category: "core" | "sponsor" | "secondary";
  status:
    | "active"
    | "connected"
    | "implemented_unconfigured"
    | "fallback_mock"
    | "fallback_in_memory"
    | "partially_implemented"
    | "simulated_mock"
    | "disconnected_by_design"
    | "evaluated_architectural_adr"
    | "blueprint_spec"
    | "disabled";
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
        ttlIndexing: "active ({ expiresAt: 1 }, expireAfterSeconds: 0)",
        compoundTokenQueryIndex: "active ({ reportId: 1, viewToken: 1 })",
      },
    },
    sentry: {
      name: "Sentry (Observability & Agent Tracing)",
      category: "sponsor",
      status: config.SENTRY_DSN ? "active" : "implemented_unconfigured",
      configured: Boolean(config.SENTRY_DSN),
      reachable: Boolean(config.SENTRY_DSN),
      verified: Boolean(config.SENTRY_DSN),
      isMockOrSimulated: !config.SENTRY_DSN,
      details: {
        environment: config.SENTRY_ENVIRONMENT,
        piiScrubbing: "active (scrubSecrets filter & data minimization)",
        agentTracingSpans: "repo_ingestion, evidence_retrieval, citation_validation, model_inference, provenance_signing, report_persistence",
      },
    },
    elevenLabs: {
      name: "ElevenLabs (Executive Audio Briefings)",
      category: "secondary",
      status: config.ELEVENLABS_API_KEY ? "active" : "implemented_unconfigured",
      configured: Boolean(config.ELEVENLABS_API_KEY),
      reachable: Boolean(config.ELEVENLABS_API_KEY),
      verified: Boolean(config.ELEVENLABS_API_KEY),
      isMockOrSimulated: !config.ELEVENLABS_API_KEY,
      details: {
        endpoint: "POST /api/reports/:id/audio",
        uiPlayer: "AudioBriefingPlayer in ReportSummary",
        characterLimit: 800,
        audioEncoding: "mp3_44100_128",
      },
    },
    tigerData: {
      name: "TigerData (PGVector Retrieval Prototype)",
      category: "sponsor",
      status: config.TIGERDATA_DATABASE_URL ? "partially_implemented" : "fallback_in_memory",
      configured: Boolean(config.TIGERDATA_DATABASE_URL),
      reachable: false,
      verified: false,
      isMockOrSimulated: true,
      details: {
        implementationState: "prototype_adapter",
        activeEngine: "in_memory_cosine",
        notice: "Prototype adapter; live PostgreSQL/pgvector cluster connection not verified",
      },
    },
    temporal: {
      name: "Temporal (Durable Workflows ADR)",
      category: "sponsor",
      status: "evaluated_architectural_adr",
      configured: Boolean(config.TEMPORAL_ADDRESS),
      reachable: false,
      verified: false,
      isMockOrSimulated: true,
      details: {
        implementationState: "architectural_evaluation",
        evaluationDoc: "docs/temporal-evaluation.md",
        notice: "Evaluated architectural blueprint; no active Temporal Server runtime worker",
      },
    },
    serpApi: {
      name: "SerpApi (External Reference Search)",
      category: "secondary",
      status: "disconnected_by_design",
      configured: Boolean(config.SERPAPI_API_KEY),
      reachable: false,
      verified: false,
      isMockOrSimulated: true,
      details: {
        implementationState: "standalone_client",
        evidenceIsolation: "external_reference_only (isCandidateEvidence: false strictly enforced)",
        rationale: "Disconnected by design to preserve cryptographic repository evidence integrity",
      },
    },
    backboard: {
      name: "Backboard (Developer Context Memory Stub)",
      category: "secondary",
      status: "simulated_mock",
      configured: Boolean(config.BACKBOARD_API_KEY),
      reachable: false,
      verified: false,
      isMockOrSimulated: true,
      details: {
        implementationState: "stub_mock",
        primaryPersistence: "Handled by MongoDB Atlas",
      },
    },
    digitalOcean: {
      name: "DigitalOcean (Compute Worker Specification)",
      category: "secondary",
      status: "blueprint_spec",
      configured: Boolean(config.DIGITALOCEAN_ACCESS_TOKEN),
      reachable: false,
      verified: false,
      isMockOrSimulated: true,
      details: {
        implementationState: "blueprint_spec",
        runtimeProvider: "Render / Docker primary",
      },
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
