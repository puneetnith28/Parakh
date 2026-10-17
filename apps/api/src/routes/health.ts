import { Router, Request, Response } from "express";
import { CONTRACTS_VERSION } from "@parakh/contracts";
import mongoose from "mongoose";
import { mastraOrchestrator } from "../mastra/index.js";
import { config } from "../config.js";
import { mongoConnection } from "../storage/mongodb.js";
import { getStorage } from "../storage/index.js";

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
