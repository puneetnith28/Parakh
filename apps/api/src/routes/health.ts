import { Router, Request, Response } from "express";
import { CONTRACTS_VERSION } from "@parakh/contracts";
import mongoose from "mongoose";
import { mastraOrchestrator } from "../mastra/index.js";
import { config } from "../config.js";
import { mongoConnection } from "../storage/mongodb.js";
import { getStorage } from "../storage/index.js";
import { scrubSecrets } from "../utils/scrubber.js";

export const healthRouter = Router();

// 1. Process Liveness: /healthz
// Returns 200 OK as long as the process is alive and responsive (Render / container liveness probe)
healthRouter.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "parakh-api",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 2. Component Diagnostics: /api/health
// Comprehensive diagnostic reporting including model provider, mastra, and storage
const getHealthStatus = (_req: Request, res: Response) => {
  const currentStorage = getStorage();
  const isDurable = currentStorage.isPersistent();

  res.status(200).json({
    status: "ok",
    service: "parakh-api",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    contractsVersion: CONTRACTS_VERSION,
    environment: config.NODE_ENV,
    truthfulReporting: true,
    modelProvider: config.MODEL_PROVIDER,
    isMockModel: config.MODEL_PROVIDER === "mock" || (!config.AI_STUDIO_API_KEY && !config.MODEL_API_KEY),
    mastra: mastraOrchestrator.getStatus(),
    storage: {
      ...mongoConnection.getStatus(),
      isPersistent: isDurable,
      storageMode: currentStorage.getMode(),
      durableStorageAvailable: mongoose.connection.readyState === 1,
    },
  });
};

healthRouter.get("/api/health", getHealthStatus);

// 3. MongoDB Atlas Deep Diagnostic: /api/health/mongodb
// Verifies live Atlas TLS encryption, database name, and round-trip ping latency
healthRouter.get("/api/health/mongodb", async (_req: Request, res: Response): Promise<void> => {
  const status = mongoConnection.getStatus();
  if (!status.connected) {
    res.status(200).json({
      connected: false,
      mode: status.mode,
      message: "MongoDB Atlas is not connected (running in stateless in-memory session mode)",
    });
    return;
  }

  try {
    const security = await mongoConnection.verifyProductionSecurity();
    res.status(200).json({
      connected: true,
      mode: "mongodb",
      host: security.host,
      database: security.database,
      tlsEnforced: security.tlsEnforced,
      pingMs: security.pingMs,
      message: `MongoDB Atlas connected securely to database '${security.database}' with TLS enforced`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      connected: false,
      error: scrubSecrets(message),
    });
  }
});

healthRouter.get("/api/ready", (_req: Request, res: Response) => {
  const currentStorage = getStorage();
  const isDurable = currentStorage.isPersistent();

  if (config.NODE_ENV === "production" && !isDurable && process.env.STORAGE_MODE !== "memory") {
    res.status(503).json({
      status: "degraded",
      ready: false,
      service: "parakh-api",
      reason: "Durable database persistence is disconnected in production.",
      storageMode: currentStorage.getMode(),
      persisted: isDurable,
    });
    return;
  }

  res.status(200).json({
    status: "ready",
    ready: true,
    service: "parakh-api",
    environment: config.NODE_ENV,
    storageMode: currentStorage.getMode(),
    persisted: isDurable,
  });
});

healthRouter.get("/api/ping", (_req: Request, res: Response) => {
  res.status(200).json({
    pong: true,
    timestamp: new Date().toISOString(),
    apiReady: true,
  });
});
