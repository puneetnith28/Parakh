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

import { issueProvenanceToken } from "../services/provenance.js";
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

    runManager.transitionState(runId, "INGESTING_REPO");

    const ingestion = await RepositoryIngestionService.ingest(repositoryUrl, {
      ref,
      maxFiles: Math.min(config.MAX_REPOSITORY_FILES, 30),
      maxPaths: config.MAX_REPOSITORY_FILES * 10,
    });

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

    report.skippedFilesCount = skippedFilesCount;

    // Validate output report strictly conforms to AssessmentReportSchema contract
    const validatedReport = AssessmentReportSchema.parse(report);

    // Complete run state transition
    runManager.transitionState(runId, "COMPLETED", { reportId: validatedReport.id });

    // Issue cryptographic provenance token binding report to verified server run
    const provenanceToken = issueProvenanceToken({
      runId,
      reportId: validatedReport.id,
      opportunityId: effectiveOpportunityId,
      repositoryUrl: canonicalUrl,
      resolvedCommitSha: commitSha,
    });

    // Persist verified report server-side with 256-bit secure viewToken
    const viewToken = crypto.randomBytes(32).toString("hex");
    const storage = getStorage();
    await storage.saveReport(validatedReport, viewToken);

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
        persisted: storage.isPersistent(),
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
 * POST /api/assessment/analyze
 * Canonical alias for analysis orchestration.
 */
analysisRouter.post("/api/assessment/analyze", handleAnalysis);
