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
