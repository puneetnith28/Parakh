import mongoose from "mongoose";
import { AssessmentReportModel, OpportunityModel } from "./Report.js";
import { AnalysisRunModel } from "./AnalysisRun.js";

export interface IndexDefinition {
  collection: string;
  fields: Record<string, 1 | -1 | "text">;
  options?: mongoose.IndexOptions;
}

export const REQUIRED_DATABASE_INDEXES: IndexDefinition[] = [
  // AssessmentReportModel indexes
  {
    collection: "assessment_reports",
    fields: { reportId: 1 },
    options: { unique: true, name: "uniq_report_id" },
  },
  {
    collection: "assessment_reports",
    fields: { viewToken: 1 },
    options: { sparse: true, name: "idx_view_token" },
  },
  {
    collection: "assessment_reports",
    fields: { opportunityId: 1, createdAt: -1 },
    options: { name: "idx_opp_created" },
  },
  {
    collection: "assessment_reports",
    fields: { expiresAt: 1 },
    options: { expireAfterSeconds: 0, name: "ttl_report_expiration" },
  },

  // AnalysisRunModel indexes
  {
    collection: "analysis_runs",
    fields: { runId: 1, status: 1 },
    options: { name: "idx_run_status" },
  },
  {
    collection: "analysis_runs",
    fields: { idempotencyKey: 1 },
    options: { sparse: true, name: "idx_idempotency_key" },
  },

  // OpportunityModel indexes
  {
    collection: "opportunities",
    fields: { opportunityId: 1 },
    options: { unique: true, name: "uniq_opportunity_id" },
  },
];

/**
 * Initializes and registers MongoDB performance indexes and TTL rules.
 * Gracefully handles stateless memory mode if database is not connected.
 */
export async function ensureDatabaseIndexes(): Promise<{
  applied: boolean;
  count: number;
  indexes: IndexDefinition[];
}> {
  if (mongoose.connection.readyState === 1) {
    try {
      await Promise.all([
        AssessmentReportModel.createIndexes(),
        AnalysisRunModel.createIndexes(),
        OpportunityModel.createIndexes(),
      ]);
      return {
        applied: true,
        count: REQUIRED_DATABASE_INDEXES.length,
        indexes: REQUIRED_DATABASE_INDEXES,
      };
    } catch (err: any) {
      console.warn("[Parakh Storage] Index creation warning:", err.message);
      return {
        applied: false,
        count: REQUIRED_DATABASE_INDEXES.length,
        indexes: REQUIRED_DATABASE_INDEXES,
      };
    }
  }

  // Stateless mode: indexes configured in schema definitions
  return {
    applied: false,
    count: REQUIRED_DATABASE_INDEXES.length,
    indexes: REQUIRED_DATABASE_INDEXES,
  };
}
