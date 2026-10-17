import express from "express";
import cors from "cors";
import helmet from "helmet";
import { healthRouter } from "./routes/health.js";
import { opportunityRouter } from "./routes/opportunity.js";
import { uploadRouter } from "./routes/upload.js";
import { repositoryRouter } from "./routes/repository.js";
import { reportsRouter } from "./routes/reports.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { mongoConnection } from "./storage/mongodb.js";
import { ensureDatabaseIndexes } from "./storage/models/indexes.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Mount routes
app.use(healthRouter);
app.use(opportunityRouter);
app.use(uploadRouter);
app.use(repositoryRouter);
app.use(reportsRouter);

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
