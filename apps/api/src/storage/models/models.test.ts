import test from "node:test";
import assert from "node:assert/strict";
import { AssessmentReportModel } from "./Report.js";
import { AnalysisRunModel } from "./AnalysisRun.js";

test("AssessmentReportModel validates valid document fixture", () => {
  const validDoc = new AssessmentReportModel({
    reportId: "rep_valid_001",
    opportunityId: "opp_123",
    repositoryUrl: "https://github.com/owner/repo",
    resolvedCommitSha: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
    status: "completed",
    schemaVersion: 1,
    viewToken: "token_abc123",
    assessments: [
      {
        requirementId: "req_001",
        requirementText: "Must use React",
        status: "demonstrated",
        rationale: "Found React code",
        citedCandidateIds: ["cand_001"],
        citations: [],
        confidence: "high",
        manuallyOverridden: false,
      },
    ],
    coverageSummary: {
      total: 1,
      demonstrated: 1,
      partiallyDemonstrated: 0,
      notDemonstrated: 0,
      needsReview: 0,
    },
  });

  const err = validDoc.validateSync();
  assert.equal(err, undefined);
});

test("AssessmentReportModel preserves opportunityTitle and repoMetadata in schema", () => {
  const docWithMetadata = new AssessmentReportModel({
    reportId: "rep_meta_001",
    opportunityId: "opp_456",
    opportunityTitle: "Principal Distributed Systems Engineer",
    repositoryUrl: "https://github.com/acme/distributed-core",
    resolvedCommitSha: "b1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b1",
    repoMetadata: {
      owner: "acme",
      repo: "distributed-core",
      defaultBranch: "main",
    },
    status: "completed",
    schemaVersion: 1,
    viewToken: "token_xyz789",
    assessments: [],
    coverageSummary: {
      total: 0,
      demonstrated: 0,
      partiallyDemonstrated: 0,
      notDemonstrated: 0,
      needsReview: 0,
    },
    scannedFilesCount: 15,
    skippedFilesCount: 0,
  });

  const err = docWithMetadata.validateSync();
  assert.equal(err, undefined);
  assert.equal(docWithMetadata.opportunityTitle, "Principal Distributed Systems Engineer");
  assert.equal(docWithMetadata.repoMetadata?.owner, "acme");
  assert.equal(docWithMetadata.repoMetadata?.repo, "distributed-core");
  assert.equal(docWithMetadata.repoMetadata?.defaultBranch, "main");
});

test("AssessmentReportModel allows backward-compatible documents missing optional provenance fields", () => {
  const legacyDoc = new AssessmentReportModel({
    reportId: "rep_legacy_001",
    opportunityId: "opp_legacy",
    repositoryUrl: "https://github.com/legacy/repo",
    resolvedCommitSha: "c1c2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b2",
    status: "completed",
    schemaVersion: 1,
    viewToken: "token_legacy",
    assessments: [],
    coverageSummary: {
      total: 0,
      demonstrated: 0,
      partiallyDemonstrated: 0,
      notDemonstrated: 0,
      needsReview: 0,
    },
  });

  const err = legacyDoc.validateSync();
  assert.equal(err, undefined);
  assert.equal(legacyDoc.opportunityTitle, undefined);
  assert.equal(legacyDoc.repoMetadata, undefined);
});

test("AssessmentReportModel rejects invalid commitSha and missing required fields", () => {
  const invalidDoc = new AssessmentReportModel({
    reportId: "rep_inv_001",
    opportunityId: "opp_123",
    repositoryUrl: "https://github.com/owner/repo",
    resolvedCommitSha: "short-sha", // Invalid: must be 40-char hex
    status: "completed",
    // viewToken missing
  });

  const err = invalidDoc.validateSync();
  assert.ok(err);
  assert.ok(err.errors.resolvedCommitSha);
  assert.ok(err.errors.viewToken);
});

test("AnalysisRunModel validates state machine values and rejects unknown states", () => {
  const validRun = new AnalysisRunModel({
    runId: "run_001",
    opportunityId: "opp_001",
    repositoryUrl: "https://github.com/owner/repo",
    status: "ASSESSING",
    schemaVersion: 1,
  });
  assert.equal(validRun.validateSync(), undefined);

  const invalidRun = new AnalysisRunModel({
    runId: "run_002",
    opportunityId: "opp_001",
    repositoryUrl: "https://github.com/owner/repo",
    status: "UNKNOWN_STATE" as any,
  });
  const err = invalidRun.validateSync();
  assert.ok(err);
  assert.ok(err.errors.status);
});
