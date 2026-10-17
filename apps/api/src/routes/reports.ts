import { Router, Response } from "express";
import { AssessmentReportSchema } from "@parakh/contracts";
import { getStorage } from "../storage/index.js";
import { sanitizeReportForPersistence } from "../storage/sanitizer.js";
import { reportService } from "../storage/services/reportService.js";
import {
  generateViewToken,
  requireReportToken,
  AuthenticatedReportRequest,
} from "../middleware/tokenAuth.js";

import { verifyReportProvenance } from "../services/provenance.js";

export const reportsRouter = Router();

/**
 * POST /api/reports
 * Persists a verified assessment report with cryptographic provenance verification.
 * Direct unprovenanced client submissions are rejected with 403 Forbidden.
 */
reportsRouter.post("/api/reports", async (req, res): Promise<void> => {
  try {
    const rawReport = req.body?.report || req.body;
    const runId = (req.body?.runId || req.headers["x-run-id"]) as string;
    const provenanceToken = (req.body?.provenanceToken || req.headers["x-provenance-token"]) as string;

    const parsed = AssessmentReportSchema.safeParse(rawReport);
    if (!parsed.success) {
      res.status(400).json({
        status: "error",
        message: "Invalid assessment report schema payload.",
        errors: parsed.error.issues,
      });
      return;
    }

    // Require and verify server-issued analysis provenance
    if (!runId || !provenanceToken) {
      res.status(403).json({
        status: "error",
        code: "UNTRUSTED_REPORT_PROVENANCE",
        message:
          "Client-submitted reports without verified server provenance are rejected. All assessment reports must originate from verified analysis execution (/api/analysis).",
      });
      return;
    }

    const verification = verifyReportProvenance(parsed.data, runId, provenanceToken);
    if (!verification.verified) {
      res.status(403).json({
        status: "error",
        code: "INVALID_PROVENANCE_SIGNATURE",
        message: `Provenance verification failed: ${verification.reason}`,
      });
      return;
    }

    const sanitizedReport = sanitizeReportForPersistence(parsed.data);
    const viewToken = generateViewToken();

    const storage = getStorage();
    await storage.saveReport(sanitizedReport, viewToken);

    res.status(201).json({
      status: "success",
      reportId: sanitizedReport.id,
      viewToken,
      accessUrl: `/api/reports/${sanitizedReport.id}?token=${viewToken}`,
      message: "Verified report persisted successfully with cryptographic access token.",
    });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      message: err.message || "Failed to persist report.",
    });
  }
});

/**
 * GET /api/reports/:id
 * Retrieves an assessment report. Requires valid viewToken.
 */
reportsRouter.get(
  "/api/reports/:id",
  requireReportToken,
  async (req: AuthenticatedReportRequest, res: Response): Promise<void> => {
    res.status(200).json({
      status: "success",
      report: req.reportRecord?.report,
    });
  }
);

/**
 * POST /api/reports/:id/share
 * Generates a shareable URL token for read-only access.
 */
reportsRouter.post(
  "/api/reports/:id/share",
  requireReportToken,
  async (req: AuthenticatedReportRequest, res: Response): Promise<void> => {
    const reportId = req.params.id;
    const viewToken = req.reportRecord?.viewToken;

    res.status(200).json({
      status: "success",
      shareUrl: `/reports/${reportId}?token=${viewToken}`,
      token: viewToken,
      expiresIn: "30 days",
    });
  }
);

/**
 * DELETE /api/reports/:id
 * Permanently deletes the report, associated analysis runs, and evidence references.
 * Returns 204 No Content upon success.
 */
reportsRouter.delete(
  "/api/reports/:id",
  requireReportToken,
  async (req: AuthenticatedReportRequest, res: Response): Promise<void> => {
    const reportId = req.params.id;
    const viewToken = req.reportRecord?.viewToken;

    if (!viewToken) {
      res.status(401).json({ status: "error", message: "Token missing" });
      return;
    }

    const success = await reportService.cascadeDeleteReport(reportId, viewToken);

    if (success) {
      res.status(204).send();
    } else {
      res.status(500).json({ status: "error", message: "Failed to delete report record." });
    }
  }
);
