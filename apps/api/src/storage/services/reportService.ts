import { AssessmentReport } from "@parakh/contracts";
import { getStorage } from "../index.js";
import { sanitizeReportForPersistence } from "../sanitizer.js";
import { generateViewToken } from "../../middleware/tokenAuth.js";
import { AssessmentReportModel } from "../models/Report.js";
import { AnalysisRunModel } from "../models/AnalysisRun.js";

export class ReportService {
  /**
   * Persists an assessment report with data minimization and generates an access token.
   */
  async createReport(
    report: AssessmentReport,
    ttlDays: number = 30
  ): Promise<{ report: AssessmentReport; viewToken: string }> {
    const sanitized = sanitizeReportForPersistence(report);
    const viewToken = generateViewToken();
    const storage = getStorage();

    await storage.saveReport(sanitized, viewToken, ttlDays);

    // If MongoDB is connected, also mirror document
    try {
      if (storage.getMode() === "mongodb") {
        await AssessmentReportModel.create({
          reportId: sanitized.id,
          opportunityId: sanitized.opportunityId,
          repositoryUrl: sanitized.repositoryUrl,
          resolvedCommitSha: sanitized.resolvedCommitSha,
          status: sanitized.status,
          schemaVersion: 1,
          viewToken,
          assessments: sanitized.assessments,
          coverageSummary: sanitized.coverageSummary,
          scannedFilesCount: sanitized.scannedFilesCount,
          skippedFilesCount: sanitized.skippedFilesCount,
          expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
        });
      }
    } catch {
      // Storage abstraction handles storage; Mongo mirror is best-effort if configured
    }

    return { report: sanitized, viewToken };
  }

  /**
   * Performs an irreversible cascade deletion: removes the report, analysis runs,
   * and evidence references permanently.
   */
  async cascadeDeleteReport(reportId: string, viewToken: string): Promise<boolean> {
    const storage = getStorage();

    // 1. Delete from primary storage
    const deleted = await storage.deleteReport(reportId, viewToken);
    if (!deleted) {
      return false;
    }

    // 2. Cascade delete from MongoDB models if connected
    try {
      if (storage.getMode() === "mongodb") {
        await AssessmentReportModel.deleteOne({ reportId, viewToken });
        await AnalysisRunModel.deleteMany({ reportId });
      }
    } catch {
      // Memory store already cleaned
    }

    return true;
  }
}

export const reportService = new ReportService();
