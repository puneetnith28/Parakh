import test from "node:test";
import assert from "node:assert/strict";
import {
  RequirementSchema,
  ExtractedRequirementsResultSchema,
  EvidenceRecordSchema,
  RequirementAssessmentSchema,
  AssessmentReportSchema,
} from "./index.js";

test("RequirementSchema validates valid requirement with req_ prefix", () => {
  const valid = {
    id: "req_auth_01",
    text: "Implement role-based authorization",
    category: "security" as const,
    priority: "mandatory" as const,
    sourceLocation: {
      pageNumber: 2,
      charStart: 120,
      charEnd: 240,
      sourceSnippet: "The platform must enforce role-based access control.",
    },
    acceptanceCriteria: ["Admins can access dashboard", "Guests are redirected"],
  };
  const parsed = RequirementSchema.parse(valid);
  assert.equal(parsed.id, "req_auth_01");
  assert.equal(parsed.category, "security");
  assert.equal(parsed.sourceLocation?.pageNumber, 2);
});

test("RequirementSchema rejects invalid ID format", () => {
  const invalid = {
    id: "invalid-id-without-prefix",
    text: "Implement role-based authorization",
    category: "security",
  };
  assert.throws(() => RequirementSchema.parse(invalid), /Requirement ID must begin with 'req_'/);
});

test("RequirementSchema rejects text under minimum length", () => {
  const invalid = {
    id: "req_01",
    text: "ab",
  };
  assert.throws(() => RequirementSchema.parse(invalid), /at least 3 characters/);
});

test("ExtractedRequirementsResultSchema validates structured model output", () => {
  const validResult = {
    summary: "Extracted 2 requirements from brief",
    requirements: [
      {
        id: "req_001",
        text: "Build React frontend with Tailwind CSS",
        category: "frontend" as const,
        priority: "mandatory" as const,
      },
      {
        id: "req_002",
        text: "Provide PostgreSQL relational database",
        category: "database" as const,
        priority: "preferred" as const,
      },
    ],
  };
  const parsed = ExtractedRequirementsResultSchema.parse(validResult);
  assert.equal(parsed.requirements.length, 2);
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
    status: "demonstrated" as const,
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

test("RepoMetadataSchema validates repository metadata", async () => {
  const { RepoMetadataSchema } = await import("./evidence.js");
  const metadata = {
    owner: "puneetnith28",
    repo: "Parakh",
    fullName: "puneetnith28/Parakh",
    description: "Developer capability platform",
    defaultBranch: "main",
    isPrivate: false,
    stars: 12,
  };
  const parsed = RepoMetadataSchema.parse(metadata);
  assert.equal(parsed.defaultBranch, "main");
  assert.equal(parsed.isPrivate, false);
});

test("AnalysisRequestSchema validates structured analysis invocation request", async () => {
  const { AnalysisRequestSchema } = await import("./assessment.js");
  const req = {
    repositoryUrl: "https://github.com/puneetnith28/Parakh",
    requirements: [
      {
        id: "req_001",
        text: "Implement role-based authorization",
        category: "security" as const,
        priority: "mandatory" as const,
      },
    ],
  };
  const parsed = AnalysisRequestSchema.parse(req);
  assert.equal(parsed.requirements.length, 1);
  assert.equal(parsed.repositoryUrl, "https://github.com/puneetnith28/Parakh");
});
