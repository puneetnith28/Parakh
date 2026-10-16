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

export const reportsRouter = Router();

/**
 * POST /api/reports
 * Persists an assessment report and generates a cryptographic access token.
 */
reportsRouter.post("/api/reports", async (req, res): Promise<void> => {
  try {
    const parsed = AssessmentReportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: "error",
        message: "Invalid assessment report schema payload.",
        errors: parsed.error.issues,
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
      message: "Report persisted successfully with cryptographic access token.",
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
