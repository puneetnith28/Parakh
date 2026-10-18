import { AssessmentReport } from "@parakh/contracts";
import { ReportStorage, StoredOpportunityRecord } from "./memoryStore.js";
import { AssessmentReportModel, OpportunityModel } from "./models/Report.js";

/**
 * MongoDB Atlas Storage Adapter utilizing versioned Mongoose documents.
 */
export class MongoReportStorage implements ReportStorage {
  getMode(): "mongodb" {
    return "mongodb";
  }

  isPersistent(): boolean {
    return true;
  }

  async saveReport(
    report: AssessmentReport,
    viewToken: string,
    ttlDays: number = 30
  ): Promise<AssessmentReport> {
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await AssessmentReportModel.findOneAndUpdate(
      { reportId: report.id },
      {
        reportId: report.id,
        opportunityId: report.opportunityId,
        opportunityTitle: report.opportunityTitle,
        repositoryUrl: report.repositoryUrl,
        resolvedCommitSha: report.resolvedCommitSha,
        repoMetadata: report.repoMetadata,
        status: report.status,
        schemaVersion: 1,
        viewToken,
        assessments: report.assessments,
        coverageSummary: report.coverageSummary,
        scannedFilesCount: report.scannedFilesCount,
        skippedFilesCount: report.skippedFilesCount,
        limitations: report.limitations || [],
        gapRecommendations: report.gapRecommendations || [],
        expiresAt,
      },
      { upsert: true, returnDocument: "after" }
    );

    return report;
  }

  async getReportById(id: string): Promise<{ report: AssessmentReport; viewToken: string } | null> {
    const doc = await AssessmentReportModel.findOne({ reportId: id });
    if (!doc) return null;

    const report: AssessmentReport = {
      id: doc.reportId,
      opportunityId: doc.opportunityId,
      ...(doc.opportunityTitle ? { opportunityTitle: doc.opportunityTitle } : {}),
      repositoryUrl: doc.repositoryUrl,
      resolvedCommitSha: doc.resolvedCommitSha,
      ...(doc.repoMetadata && doc.repoMetadata.owner
        ? {
            repoMetadata: {
              owner: doc.repoMetadata.owner,
              repo: doc.repoMetadata.repo,
              ...(doc.repoMetadata.defaultBranch ? { defaultBranch: doc.repoMetadata.defaultBranch } : {}),
            },
          }
        : {}),
      status: doc.status as any,
      assessments: doc.assessments as any,
      coverageSummary: doc.coverageSummary as any,
      scannedFilesCount: doc.scannedFilesCount,
      skippedFilesCount: doc.skippedFilesCount,
      limitations: (doc as any).limitations || [],
      gapRecommendations: (doc as any).gapRecommendations || [],
      createdAt: (doc as any).createdAt ? (doc as any).createdAt.toISOString() : new Date().toISOString(),
    };

    return {
      report,
      viewToken: doc.viewToken,
    };
  }

  async getReportByToken(id: string, viewToken: string): Promise<AssessmentReport | null> {
    const doc = await AssessmentReportModel.findOne({ reportId: id, viewToken });
    if (!doc) return null;

    return {
      id: doc.reportId,
      opportunityId: doc.opportunityId,
      ...(doc.opportunityTitle ? { opportunityTitle: doc.opportunityTitle } : {}),
      repositoryUrl: doc.repositoryUrl,
      resolvedCommitSha: doc.resolvedCommitSha,
      ...(doc.repoMetadata && doc.repoMetadata.owner
        ? {
            repoMetadata: {
              owner: doc.repoMetadata.owner,
              repo: doc.repoMetadata.repo,
              ...(doc.repoMetadata.defaultBranch ? { defaultBranch: doc.repoMetadata.defaultBranch } : {}),
            },
          }
        : {}),
      status: doc.status as any,
      assessments: doc.assessments as any,
      coverageSummary: doc.coverageSummary as any,
      scannedFilesCount: doc.scannedFilesCount,
      skippedFilesCount: doc.skippedFilesCount,
      limitations: (doc as any).limitations || [],
      gapRecommendations: (doc as any).gapRecommendations || [],
      createdAt: (doc as any).createdAt ? (doc as any).createdAt.toISOString() : new Date().toISOString(),
    };
  }

  async deleteReport(id: string, viewToken: string): Promise<boolean> {
    const res = await AssessmentReportModel.deleteOne({ reportId: id, viewToken });
    return res.deletedCount > 0;
  }

  async saveOpportunity(opp: { id: string; rawText: string; title: string }): Promise<void> {
    await OpportunityModel.findOneAndUpdate(
      { opportunityId: opp.id },
      {
        opportunityId: opp.id,
        rawText: opp.rawText,
        title: opp.title,
        schemaVersion: 1,
      },
      { upsert: true, returnDocument: "after" }
    );
  }

  async getOpportunity(id: string): Promise<StoredOpportunityRecord | null> {
    const doc = await OpportunityModel.findOne({ opportunityId: id });
    if (!doc) return null;

    return {
      id: doc.opportunityId,
      rawText: doc.rawText,
      title: doc.title,
      createdAt: (doc as any).createdAt || new Date(),
    };
  }

  async clearAll(): Promise<void> {
    await AssessmentReportModel.deleteMany({});
    await OpportunityModel.deleteMany({});
  }
}
