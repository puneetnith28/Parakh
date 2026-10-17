import express from "express";
import cors from "cors";
import helmet from "helmet";
import { healthRouter } from "./routes/health.js";
import { opportunityRouter } from "./routes/opportunity.js";
import { uploadRouter } from "./routes/upload.js";
import { repositoryRouter } from "./routes/repository.js";
import { reportsRouter } from "./routes/reports.js";
import { analysisRouter } from "./routes/analysis.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { mongoConnection } from "./storage/mongodb.js";
import { ensureDatabaseIndexes } from "./storage/models/indexes.js";
import { initSentry } from "./observability/sentry.js";
import { config, validateConfigAtStartup } from "./config.js";
import { analysisRateLimiter } from "./middleware/rateLimiter.js";

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

// Mount routes
app.use(healthRouter);
app.use(opportunityRouter);
app.use(uploadRouter);
app.use(repositoryRouter);
app.use(reportsRouter);
app.use(analysisRouter);

// Centralized error handling middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== "test" && !process.env.NODE_TEST_CONTEXT) {
  if (process.env.MONGODB_URI) {
    mongoConnection.connect(process.env.MONGODB_URI).then(() => {
      ensureDatabaseIndexes().catch((err) =>
        console.warn("[Parakh API] Index registration warning:", err.message)
      );
    });
  }
  app.listen(PORT, () => {
    console.log(`[Parakh API] Listening on port ${PORT}`);
  });
}

export default app;
