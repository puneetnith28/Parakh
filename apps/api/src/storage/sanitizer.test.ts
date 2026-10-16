import test from "node:test";
import assert from "node:assert/strict";
import { AssessmentReport } from "@parakh/contracts";
import {
  sanitizeReportForPersistence,
  verifyDataMinimization,
  MAX_SNIPPET_BYTES,
} from "./sanitizer.js";

test("sanitizeReportForPersistence bounds long code snippets to <= 500 bytes", () => {
  const giantSnippet = "console.log('huge chunk of code');\n".repeat(80); // ~2800 bytes
  assert.ok(Buffer.byteLength(giantSnippet, "utf8") > 1500);

  const sampleReport: AssessmentReport = {
    id: "rep_large_001",
    opportunityId: "opp_1",
    repositoryUrl: "https://github.com/owner/repo",
    resolvedCommitSha: "a".repeat(40),
    status: "completed",
    assessments: [
      {
        requirementId: "req_001",
        requirementText: "Test Large Snippet",
        status: "demonstrated",
        rationale: "Found code",
        citedCandidateIds: ["cand_001"],
        citations: [
          {
            candidateId: "cand_001",
            repository: "owner/repo",
            commitSha: "a".repeat(40),
            path: "src/big.ts",
            canonicalUrl: "https://github.com/owner/repo/blob/master/src/big.ts",
            evidenceType: "source_code",
            snippet: giantSnippet,
          },
        ],
        nextActions: [],
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
    scannedFilesCount: 1,
    skippedFilesCount: 0,
    createdAt: new Date().toISOString(),
  };

  const sanitized = sanitizeReportForPersistence(sampleReport);
  const truncatedSnippet = sanitized.assessments[0].citations[0].snippet;

  assert.ok(truncatedSnippet.includes("[...snippet truncated to 500 bytes for data minimization...]"));
  assert.ok(Buffer.byteLength(truncatedSnippet, "utf8") <= MAX_SNIPPET_BYTES + 80);

  const check = verifyDataMinimization(sanitized);
  assert.equal(check.valid, true);
});
