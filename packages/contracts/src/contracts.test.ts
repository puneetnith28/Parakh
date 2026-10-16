import test from "node:test";
import assert from "node:assert/strict";
import {
  RequirementSchema,
  EvidenceRecordSchema,
  RequirementAssessmentSchema,
  AssessmentReportSchema,
} from "./index.js";

test("RequirementSchema validates valid requirement", () => {
  const valid = {
    id: "req_001",
    text: "Implement role-based authorization",
    category: "security",
    priority: "mandatory",
  };
  const parsed = RequirementSchema.parse(valid);
  assert.equal(parsed.id, "req_001");
  assert.equal(parsed.category, "security");
});

test("EvidenceRecordSchema enforces 40-character commit SHA", () => {
  const invalid = {
    id: "evi_001",
    repository: "owner/repo",
    commitSha: "short-sha",
    path: "src/auth.ts",
    canonicalUrl: "https://github.com/owner/repo/blob/abc/src/auth.ts",
    fileType: "source",
    lineCount: 100,
    content: "console.log('hi')",
  };
  assert.throws(() => EvidenceRecordSchema.parse(invalid));
});

test("RequirementAssessmentSchema validates valid assessment", () => {
  const valid = {
    requirementId: "req_001",
    requirementText: "Implement role-based authorization",
    status: "demonstrated",
    rationale: "Found role check middleware",
    citations: [
      {
        candidateId: "cand_01",
        repository: "owner/repo",
        commitSha: "1234567890abcdef1234567890abcdef12345678",
        path: "src/middleware.ts",
        canonicalUrl: "https://github.com/owner/repo/blob/123/src/middleware.ts",
        startLine: 10,
        endLine: 25,
        snippet: "if (user.role !== 'admin') throw new ForbiddenError()",
      },
    ],
  };
  const parsed = RequirementAssessmentSchema.parse(valid);
  assert.equal(parsed.status, "demonstrated");
  assert.equal(parsed.citations.length, 1);
});

test("AssessmentReportSchema validates complete report payload", () => {
  const validReport = {
    id: "rep_001",
    opportunityId: "opp_001",
    repositoryUrl: "https://github.com/owner/repo",
    resolvedCommitSha: "1234567890abcdef1234567890abcdef12345678",
    status: "completed" as const,
    assessments: [],
    coverageSummary: {
      total: 0,
      demonstrated: 0,
      partiallyDemonstrated: 0,
      notDemonstrated: 0,
      needsReview: 0,
    },
    scannedFilesCount: 15,
    skippedFilesCount: 5,
    createdAt: new Date().toISOString(),
  };
  const parsed = AssessmentReportSchema.parse(validReport);
  assert.equal(parsed.status, "completed");
  assert.equal(parsed.scannedFilesCount, 15);
});
