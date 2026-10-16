import { z } from "zod";

export const FileTypeSchema = z.enum(["source", "test", "doc", "config"]);
export type FileType = z.infer<typeof FileTypeSchema>;

export const IngestionStatusSchema = z.enum(["full", "truncated", "skipped"]);
export type IngestionStatus = z.infer<typeof IngestionStatusSchema>;

export const PinnedRevisionSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  ref: z.string().min(1),
  commitSha: z.string().regex(/^[0-9a-f]{40}$/i, "Must be a 40-character commit SHA"),
  resolvedAt: z.string().datetime().or(z.string()),
});

export type PinnedRevision = z.infer<typeof PinnedRevisionSchema>;

export const EvidenceRecordSchema = z.object({
  id: z.string().min(1),
  repository: z.string(), // owner/repo
  commitSha: z.string().regex(/^[0-9a-f]{40}$/i, "Must be a 40-character commit SHA"),
  path: z.string(),
  canonicalUrl: z.string().url(),
  fileType: FileTypeSchema,
  language: z.string().optional(),
  lineCount: z.number().int().nonnegative(),
  content: z.string(),
  ingestionStatus: IngestionStatusSchema.default("full"),
});

export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;

export const CandidateSnippetSchema = z.object({
  candidateId: z.string().min(1),
  fileId: z.string().min(1),
  path: z.string(),
  commitSha: z.string(),
  canonicalUrl: z.string().url(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  content: z.string(),
  score: z.number().optional(),
  fileType: FileTypeSchema,
});

export type CandidateSnippet = z.infer<typeof CandidateSnippetSchema>;
