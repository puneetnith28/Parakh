import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { mastraOrchestrator } from "./mastra/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Health Check Probe
app.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "parakh-api",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    mastra: mastraOrchestrator.getStatus(),
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[Parakh API] Listening on port ${PORT}`);
  });
}

export default app;
