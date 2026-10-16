import { z } from "zod";

export const EvidenceStatusSchema = z.enum([
  "demonstrated",
  "partially_demonstrated",
  "not_demonstrated",
  "needs_review",
]);

export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>;

export const CitationSchema = z.object({
  candidateId: z.string().min(1),
  repository: z.string(),
  commitSha: z.string(),
  path: z.string(),
  canonicalUrl: z.string().url(),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
  evidenceType: z.string().default("source_code"),
  snippet: z.string(),
  supports: z.string().optional(),
  limitations: z.string().optional(),
});

export type Citation = z.infer<typeof CitationSchema>;

/**
 * Raw Model Output Schema returned by Gemma evaluation step.
 */
export const ModelAssessmentOutputSchema = z.object({
  requirementId: z.string().optional(),
  status: EvidenceStatusSchema,
  rationale: z.string().min(1),
  citedCandidateIds: z.array(z.string()).default([]),
  limitations: z.string().optional(),
  nextActions: z
    .array(z.string())
    .or(z.string().transform((s) => [s]))
    .default([]),
});

export type ModelAssessmentOutput = z.infer<typeof ModelAssessmentOutputSchema>;

/**
 * Complete verified Requirement Assessment with citations and downgrade metadata.
 */
export const RequirementAssessmentSchema = z.object({
  requirementId: z.string().min(1),
  requirementText: z.string(),
  status: EvidenceStatusSchema,
  rationale: z.string(),
  citedCandidateIds: z.array(z.string()).default([]),
  citations: z.array(CitationSchema).default([]),
  limitations: z.string().optional(),
  nextActions: z.array(z.string()).default([]),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  manuallyOverridden: z.boolean().default(false),
  userNotes: z.string().optional(),
  originalStatus: EvidenceStatusSchema.optional(),
  downgradeReason: z.string().optional(),
});

export type RequirementAssessment = z.infer<typeof RequirementAssessmentSchema>;

export const AssessmentReportSchema = z.object({
  id: z.string().min(1),
  opportunityId: z.string().min(1),
  repositoryUrl: z.string().url(),
  resolvedCommitSha: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "failed"]),
  assessments: z.array(RequirementAssessmentSchema),
  coverageSummary: z.object({
    total: z.number().int().nonnegative(),
    demonstrated: z.number().int().nonnegative(),
    partiallyDemonstrated: z.number().int().nonnegative(),
    notDemonstrated: z.number().int().nonnegative(),
    needsReview: z.number().int().nonnegative(),
  }),
  scannedFilesCount: z.number().int().nonnegative(),
  skippedFilesCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export type AssessmentReport = z.infer<typeof AssessmentReportSchema>;
