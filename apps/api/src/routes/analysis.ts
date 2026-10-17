import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "node:crypto";
import {
  AnalysisRequestSchema,
  AssessmentReportSchema,
  type AssessmentReport,
} from "@parakh/contracts";
import {
  validateGitHubUrl,
  RepositoryIngestionService,
} from "@parakh/evidence";
import { UnifiedEvidenceRetriever } from "@parakh/assessment";
import { AssessmentService } from "../services/assessmentService.js";
import { GemmaClient } from "@parakh/integrations";
import { config } from "../config.js";
import { getStorage } from "../storage/index.js";

import { issueProvenanceToken, computeReportContentHash } from "../services/provenance.js";
import { runManager } from "../services/runManager.js";

export const analysisRouter = Router();

async function handleAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = AnalysisRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: "error",
        message: "Invalid analysis request parameters",
        errors: parsed.error.errors,
      });
      return;
    }

    const { repositoryUrl, requirements, ref, opportunityId, title } = parsed.data;

    // Validate GitHub URL and enforce network boundaries (SSRF defense)
    const urlValidation = validateGitHubUrl(repositoryUrl);
    if (!urlValidation.valid) {
      res.status(400).json({
        status: "error",
        message: urlValidation.error || "Invalid repository URL",
      });
      return;
    }

    const { canonicalUrl } = urlValidation;
    const runId = crypto.randomUUID();
    const effectiveOpportunityId = opportunityId || `opp_${crypto.randomUUID()}`;

    // Register active analysis run in state machine
    runManager.createOrGetRun({
      runId,
      opportunityId: effectiveOpportunityId,
      repositoryUrl: canonicalUrl,
    });

    if (runManager.isCancelled(runId)) {
      res.status(499).json({
        status: "cancelled",
        runId,
        message: "Analysis run was cancelled before repository ingestion.",
      });
      return;
    }

    runManager.transitionState(runId, "INGESTING_REPO");

    const ingestion = await RepositoryIngestionService.ingest(repositoryUrl, {
      ref,
      maxFiles: Math.min(config.MAX_REPOSITORY_FILES, 30),
      maxPaths: config.MAX_REPOSITORY_FILES * 10,
    });

    if (runManager.isCancelled(runId)) {
      res.status(499).json({
        status: "cancelled",
        runId,
        message: "Analysis run was cancelled after repository ingestion.",
      });
      return;
    }

    const records = ingestion.records;
    const commitSha = ingestion.commitSha;
    const skippedFilesCount = ingestion.skippedFilesCount;

    runManager.transitionState(runId, "RETRIEVING_CHUNKS", { scannedFiles: records.length });

    // Configure model inference client for assessment
    const gemmaClient = new GemmaClient({
      provider: config.MODEL_PROVIDER as any,
      modelName: config.MODEL_NAME,
      apiKey: config.MODEL_API_KEY || config.AI_STUDIO_API_KEY,
    });

    const retriever = new UnifiedEvidenceRetriever();
    const assessmentService = new AssessmentService({
      gemmaClient,
      retriever,
    });

    if (runManager.isCancelled(runId)) {
      res.status(499).json({
        status: "cancelled",
        runId,
        message: "Analysis run was cancelled before assessment evaluation.",
      });
      return;
    }

    runManager.transitionState(runId, "ASSESSING");

    const report: AssessmentReport = await assessmentService.evaluateRepository({
      runId,
      opportunityId: effectiveOpportunityId,
      opportunityTitle: title,
      repositoryUrl: canonicalUrl,
      commitSha,
      repoMetadata: {
        owner: ingestion.owner,
        repo: ingestion.repo,
        defaultBranch: ingestion.metadata.defaultBranch,
      },
      warnings: ingestion.warnings,
      requirements,
      records,
    });

    if (runManager.isCancelled(runId)) {
      res.status(499).json({
        status: "cancelled",
        runId,
        message: "Analysis run was cancelled during evaluation. Persisting report aborted.",
      });
      return;
    }

    report.skippedFilesCount = skippedFilesCount;

    // Validate output report strictly conforms to AssessmentReportSchema contract
    const validatedReport = AssessmentReportSchema.parse(report);

    // Compute canonical deterministic content hash binding all report fields
    const contentHash = computeReportContentHash(validatedReport);

    // Complete run state transition recording authoritative content hash
    runManager.transitionState(runId, "COMPLETED", {
      reportId: validatedReport.id,
      reportContentHash: contentHash,
    });

    // Issue cryptographic provenance token binding report content to verified server run
    const provenanceToken = issueProvenanceToken({
      runId,
      reportId: validatedReport.id,
      opportunityId: effectiveOpportunityId,
      repositoryUrl: canonicalUrl,
      resolvedCommitSha: commitSha,
      contentHash,
    });

    // Persistence policy: Production must not silently fall back to ephemeral memory
    const storage = getStorage();
    const isPersistent = storage.isPersistent();

    if (config.NODE_ENV === "production" && !isPersistent && process.env.STORAGE_MODE !== "memory") {
      res.status(503).json({
        status: "error",
        code: "DURABLE_STORAGE_UNAVAILABLE",
        message:
          "Durable database persistence is unavailable in production. Assessment completed but report cannot be durably saved or shared.",
        report: validatedReport,
        runId,
        provenanceToken,
        persisted: false,
        shareable: false,
      });
      return;
    }

    // Persist verified report server-side with 256-bit secure viewToken
    let viewToken: string | undefined;
    try {
      viewToken = crypto.randomBytes(32).toString("hex");
      await storage.saveReport(validatedReport, viewToken);
    } catch (saveErr: any) {
      if (config.NODE_ENV === "production" && process.env.STORAGE_MODE !== "memory") {
        res.status(503).json({
          status: "error",
          code: "PERSISTENCE_FAILURE",
          message: `Failed to persist assessment report to durable storage: ${saveErr.message}`,
          report: validatedReport,
          runId,
          provenanceToken,
          persisted: false,
          shareable: false,
        });
        return;
      }
    }

    res.status(200).json({
      status: "success",
      report: validatedReport,
      viewToken,
      runId,
      provenanceToken,
      metadata: {
        opportunityTitle: title || "Technical Capability Assessment",
        modelProvider: config.MODEL_PROVIDER,
        isMock: config.MODEL_PROVIDER === "mock" || (!config.MODEL_API_KEY && !config.AI_STUDIO_API_KEY),
        filesScanned: records.length,
        storageMode: storage.getMode(),
        persisted: isPersistent,
        provenanceVerified: true,
      },
    });
  } catch (err: unknown) {
    next(err);
  }
}

/**
 * POST /api/analysis
 * Orchestrates full end-to-end capability evaluation.
 */
analysisRouter.post("/api/analysis", handleAnalysis);

/**
 * POST /api/analysis/:runId/cancel
 * Signals server-side cancellation of an active analysis run.
 */
analysisRouter.post("/api/analysis/:runId/cancel", (req: Request, res: Response): void => {
  const { runId } = req.params;
  const reason = (req.body?.reason as string) || "Client requested cancellation";

  const run = runManager.getRun(runId);
  if (!run) {
    res.status(404).json({
      status: "error",
      message: `Analysis run '${runId}' not found.`,
    });
    return;
  }

  if (run.status === "COMPLETED") {
    res.status(400).json({
      status: "error",
      message: `Cannot cancel analysis run '${runId}' because it has already completed.`,
    });
    return;
  }

  const cancelled = runManager.cancelRun(runId, reason);
  res.status(200).json({
    status: "success",
    runId,
    cancelled: Boolean(cancelled),
    reason,
    message: "Analysis run cancellation dispatched.",
  });
});

/**
 * POST /api/assessment/analyze
 * Canonical alias for analysis orchestration.
 */
analysisRouter.post("/api/assessment/analyze", handleAnalysis);
