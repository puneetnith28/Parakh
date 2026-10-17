import mongoose, { Schema, Document, Model } from "mongoose";

export type RunStatus =
  | "INITIALIZED"
  | "INGESTING_REPO"
  | "RETRIEVING_CHUNKS"
  | "ASSESSING"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

export interface IAnalysisRunDocument extends Document {
  runId: string;
  opportunityId: string;
  repositoryUrl: string;
  idempotencyKey?: string;
  status: RunStatus;
  schemaVersion: number;
  reportId?: string;
  error?: string;
  scannedFiles: number;
  durationMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisRunMongooseSchema = new Schema<IAnalysisRunDocument>(
  {
    runId: { type: String, required: true, unique: true, index: true },
    opportunityId: { type: String, required: true, index: true },
    repositoryUrl: { type: String, required: true },
    idempotencyKey: { type: String, sparse: true, index: true },
    status: {
      type: String,
      enum: ["INITIALIZED", "INGESTING_REPO", "RETRIEVING_CHUNKS", "ASSESSING", "COMPLETED", "CANCELLED", "FAILED"],
      default: "INITIALIZED",
      required: true,
    },
    schemaVersion: { type: Number, default: 1, required: true },
    reportId: { type: String },
    error: { type: String },
    scannedFiles: { type: Number, default: 0 },
    durationMs: { type: Number },
  },
  {
    timestamps: true,
    collection: "analysis_runs",
  }
);

export const AnalysisRunModel: Model<IAnalysisRunDocument> =
  mongoose.models.AnalysisRun ||
  mongoose.model<IAnalysisRunDocument>("AnalysisRun", AnalysisRunMongooseSchema);
