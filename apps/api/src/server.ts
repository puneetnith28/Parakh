import express from "express";
import cors from "cors";
import helmet from "helmet";
import { healthRouter } from "./routes/health.js";
import { opportunityRouter } from "./routes/opportunity.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Mount routes
app.use(healthRouter);
app.use(opportunityRouter);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[Parakh API] Listening on port ${PORT}`);
  });
}

export default app;
