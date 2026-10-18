import path from "node:path";
import fs from "node:fs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { healthRouter } from "./routes/health.js";
import { opportunityRouter } from "./routes/opportunity.js";
import { uploadRouter } from "./routes/upload.js";
import { repositoryRouter } from "./routes/repository.js";
import { reportsRouter } from "./routes/reports.js";
import { analysisRouter } from "./routes/analysis.js";
import { integrationsRouter } from "./routes/integrations.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { mongoConnection } from "./storage/mongodb.js";
import { ensureDatabaseIndexes } from "./storage/models/indexes.js";
import { initSentry } from "./observability/sentry.js";
import { config, validateConfigAtStartup } from "./config.js";
import { analysisRateLimiter } from "./middleware/rateLimiter.js";
import { getStorage } from "./storage/index.js";
import type { Server } from "node:http";

// Initialize Sentry agent tracing
initSentry();
validateConfigAtStartup();

const app = express();
const PORT = process.env.PORT || 3000;

// Allowed CORS origins based on configuration and local development
const allowedOrigins = new Set([
  config.FRONTEND_URL,
  config.WEB_ORIGIN,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
]);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, tests)
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: Origin ${origin} is not authorized.`));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// Rate limiting on resource-intensive analysis and ingestion endpoints
app.use("/api/analysis", analysisRateLimiter);
app.use("/api/assessment/analyze", analysisRateLimiter);
app.use("/api/repository/inspect", analysisRateLimiter);

// 1. Mount health and readiness routes first (always accessible for liveness/readiness probes)
app.use(healthRouter);

/**
 * Production storage readiness traffic guard:
 * Blocks normal application traffic if durable storage is disconnected in production.
 */
export function productionStorageGuard(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  // Only guard API endpoints; static web assets, frontend SPA, and healthz are allowed
  if (!req.path.startsWith("/api")) {
    return next();
  }

  if (config.NODE_ENV === "production" && process.env.STORAGE_MODE !== "memory") {
    const storage = getStorage();
    if (!storage.isPersistent()) {
      res.status(503).json({
        status: "error",
        code: "DURABLE_STORAGE_UNAVAILABLE",
        message:
          "Durable database persistence is unavailable in production. Normal application traffic is suspended until database readiness is restored.",
        ready: false,
        persisted: false,
      });
      return;
    }
  }
  next();
}

app.use(productionStorageGuard);

// 2. Mount normal application routes (guarded by storage readiness in production)
app.use(opportunityRouter);
app.use(uploadRouter);
app.use(repositoryRouter);
app.use(reportsRouter);
app.use(analysisRouter);
app.use(integrationsRouter);

// Serve static assets from apps/web/dist if present (e.g. Docker container or monorepo root)
const candidateDistPaths = [
  path.resolve(process.cwd(), "apps/web/dist"),
  path.resolve(process.cwd(), "../web/dist"),
  path.resolve(process.cwd(), "../../apps/web/dist"),
];
const distPath = candidateDistPaths.find((p) => fs.existsSync(p));
if (distPath) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api|\/healthz).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Centralized error handling middleware
app.use(errorHandler);

let activeServer: Server | null = null;

export async function startServer(port: number = Number(PORT)): Promise<Server> {
  const isProduction = config.NODE_ENV === "production";
  const isExplicitMemory = process.env.STORAGE_MODE === "memory";

  if (config.MONGODB_URI) {
    console.log("[Parakh API] Initializing MongoDB connection...");
    const connected = await mongoConnection.connect(config.MONGODB_URI);
    if (connected) {
      try {
        await ensureDatabaseIndexes();
        console.log("[Parakh API] Database indexes verified.");
      } catch (err: any) {
        console.warn("[Parakh API] Index registration warning:", err.message);
      }
    } else if (isProduction && !isExplicitMemory) {
      console.error("[Parakh API] FATAL: Failed to connect to required MongoDB in production.");
    }
  } else if (isProduction && !isExplicitMemory) {
    console.warn("[Parakh API] WARNING: MONGODB_URI is not set in production mode.");
  }

  return new Promise((resolve) => {
    activeServer = app.listen(port, () => {
      console.log(`[Parakh API] Listening on port ${port} (env: ${config.NODE_ENV})`);
      resolve(activeServer!);
    });
  });
}

export async function shutdownServer(server?: Server): Promise<void> {
  const targetServer = server || activeServer;
  if (targetServer) {
    await new Promise<void>((resolve, reject) => {
      targetServer.close((err) => (err ? reject(err) : resolve()));
    });
    activeServer = null;
  }
  await mongoConnection.disconnect();
}

if (process.env.NODE_ENV !== "test" && !process.env.NODE_TEST_CONTEXT) {
  startServer().catch((err) => {
    console.error("[Parakh API] Unhandled startup error:", err);
    process.exit(1);
  });

  const handleTermination = async (signal: string) => {
    console.log(`[Parakh API] Received ${signal}. Gracefully shutting down...`);
    try {
      await shutdownServer();
      console.log("[Parakh API] Shutdown complete.");
      process.exit(0);
    } catch (err) {
      console.error("[Parakh API] Error during shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => handleTermination("SIGTERM"));
  process.on("SIGINT", () => handleTermination("SIGINT"));
}

export default app;
