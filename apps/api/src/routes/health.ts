import { Router, Request, Response } from "express";
import { CONTRACTS_VERSION } from "@parakh/contracts";
import { mastraOrchestrator } from "../mastra/index.js";
import { config } from "../config.js";
import { mongoConnection } from "../storage/mongodb.js";

export const healthRouter = Router();

healthRouter.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "parakh-api",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    contractsVersion: CONTRACTS_VERSION,
    environment: config.NODE_ENV,
    mastra: mastraOrchestrator.getStatus(),
    storage: mongoConnection.getStatus(),
  });
});

healthRouter.get("/api/ping", (_req: Request, res: Response) => {
  res.status(200).json({
    pong: true,
    timestamp: new Date().toISOString(),
    apiReady: true,
  });
});
