import express from "express";
import cors from "cors";
import helmet from "helmet";
import { healthRouter } from "./routes/health.js";
import { opportunityRouter } from "./routes/opportunity.js";
import { uploadRouter } from "./routes/upload.js";
import { repositoryRouter } from "./routes/repository.js";
import { errorHandler } from "./middleware/errorHandler.js";

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

// Centralized error handling middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== "test" && !process.env.NODE_TEST_CONTEXT) {
  app.listen(PORT, () => {
    console.log(`[Parakh API] Listening on port ${PORT}`);
  });
}

export default app;
