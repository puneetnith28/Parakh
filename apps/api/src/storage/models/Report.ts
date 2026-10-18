import mongoose, { Schema, Document, Model } from "mongoose";
import { AssessmentReport } from "@parakh/contracts";

export interface IAssessmentReportDocument extends Document {
  reportId: string;
  opportunityId: string;
  opportunityTitle?: string;
  repositoryUrl: string;
  resolvedCommitSha: string;
  repoMetadata?: AssessmentReport["repoMetadata"];
  status: "pending" | "in_progress" | "completed" | "failed";
  schemaVersion: number;
  viewToken: string;
  assessments: AssessmentReport["assessments"];
  coverageSummary: AssessmentReport["coverageSummary"];
  scannedFilesCount: number;
  skippedFilesCount: number;
  limitations?: AssessmentReport["limitations"];
  gapRecommendations?: AssessmentReport["gapRecommendations"];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RepoMetadataMongooseSchema = new Schema(
  {
    owner: { type: String, required: true },
    repo: { type: String, required: true },
    defaultBranch: { type: String },
  },
  { _id: false }
);

const CitationMongooseSchema = new Schema(
  {
    candidateId: { type: String, required: true },
    repository: { type: String, required: true },
    commitSha: { type: String, required: true },
    path: { type: String, required: true },
    canonicalUrl: { type: String, required: true },
    startLine: { type: Number },
    endLine: { type: Number },
    evidenceType: { type: String, default: "source_code" },
    snippet: { type: String, required: true },
    supports: { type: String },
    limitations: { type: String },
  },
  { _id: false }
);

const RequirementAssessmentMongooseSchema = new Schema(
  {
    requirementId: { type: String, required: true },
    requirementText: { type: String, required: true },
    status: {
      type: String,
      enum: ["demonstrated", "partially_demonstrated", "not_demonstrated", "needs_review"],
      required: true,
    },
    rationale: { type: String, required: true },
    citedCandidateIds: [{ type: String }],
    citations: [CitationMongooseSchema],
    limitations: { type: String },
    nextActions: [{ type: String }],
    confidence: { type: String, enum: ["high", "medium", "low"], default: "medium" },
    manuallyOverridden: { type: Boolean, default: false },
    userNotes: { type: String },
    originalStatus: { type: String },
    downgradeReason: { type: String },
  },
  { _id: false }
);

const ReportMongooseSchema = new Schema<IAssessmentReportDocument>(
  {
    reportId: { type: String, required: true, unique: true, index: true },
    opportunityId: { type: String, required: true, index: true },
    opportunityTitle: { type: String },
    repositoryUrl: { type: String, required: true },
    resolvedCommitSha: {
      type: String,
      required: true,
      match: /^[0-9a-fA-F]{40}$/,
    },
    repoMetadata: { type: RepoMetadataMongooseSchema },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "failed"],
      default: "completed",
      required: true,
    },
    schemaVersion: { type: Number, default: 1, required: true },
    viewToken: { type: String, required: true, index: true },
    assessments: [RequirementAssessmentMongooseSchema],
    coverageSummary: {
      total: { type: Number, required: true },
      demonstrated: { type: Number, required: true },
      partiallyDemonstrated: { type: Number, required: true },
      notDemonstrated: { type: Number, required: true },
      needsReview: { type: Number, required: true },
    },
    scannedFilesCount: { type: Number, default: 0 },
    skippedFilesCount: { type: Number, default: 0 },
    limitations: [{ type: String }],
    gapRecommendations: [{ type: String }],
    expiresAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "assessment_reports",
  }
);

// Models
export const AssessmentReportModel: Model<IAssessmentReportDocument> =
  mongoose.models.AssessmentReport ||
  mongoose.model<IAssessmentReportDocument>("AssessmentReport", ReportMongooseSchema);

// Opportunity Document Schema
export interface IOpportunityDocument extends Document {
  opportunityId: string;
  title: string;
  rawText: string;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const OpportunityMongooseSchema = new Schema<IOpportunityDocument>(
  {
    opportunityId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    rawText: { type: String, required: true },
    schemaVersion: { type: Number, default: 1 },
  },
  {
    timestamps: true,
    collection: "opportunities",
  }
);

export const OpportunityModel: Model<IOpportunityDocument> =
  mongoose.models.Opportunity ||
  mongoose.model<IOpportunityDocument>("Opportunity", OpportunityMongooseSchema);
