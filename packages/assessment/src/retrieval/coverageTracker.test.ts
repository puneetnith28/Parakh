import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CoverageTracker } from "./coverageTracker.js";

import type { CandidateSnippet } from "@parakh/contracts";

describe("Retrieval Coverage & Diagnostic Auditing", () => {
  test("computes accurate coverage metrics and ratios", () => {
    const tracker = new CoverageTracker("run_001", "owner/repo", "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5");

    tracker.recordScanMetrics({
      totalFilesScanned: 100,
      filesExcludedByDenylist: 40,
      eligibleFilesCount: 60,
      totalChunksIndexed: 120,
      isTruncated: false,
    });

    const dummySnippet = (id: string): CandidateSnippet => ({
      candidateId: id,
      fileId: "f1",
      path: "src/file.ts",
      commitSha: "sha1",
      canonicalUrl: "https://github.com/owner/repo/blob/sha1/src/file.ts",
      startLine: 1,
      endLine: 10,
      content: "dummy",
      fileType: "source",
    });

    tracker.recordRequirementResults([
      {
        requirementId: "req_1",
        requirementText: "Auth",
        candidates: [dummySnippet("c1")],
        candidateCount: 1,
        totalTokensEstimated: 250,
      },
      {
        requirementId: "req_2",
        requirementText: "Docker",
        candidates: [dummySnippet("c2"), dummySnippet("c3")],
        candidateCount: 2,
        totalTokensEstimated: 500,
      },
      {
        requirementId: "req_3",
        requirementText: "Kubernetes",
        candidates: [],
        candidateCount: 0,
        totalTokensEstimated: 0,
      },
    ]);

    const audit = tracker.finalizeAudit();

    assert.equal(audit.runId, "run_001");
    assert.equal(audit.totalFilesScanned, 100);
    assert.equal(audit.filesExcludedByDenylist, 40);
    assert.equal(audit.eligibleFilesCount, 60);
    assert.equal(audit.totalRequirementsEvaluated, 3);
    assert.equal(audit.requirementsWithCandidatesCount, 2);
    assert.equal(audit.requirementsWithoutEvidenceCount, 1);
    assert.equal(audit.candidateCoverageRatio, 0.667);
    assert.equal(audit.averageCandidatesPerRequirement, 1);
    assert.equal(audit.totalTokensEstimated, 750);
    assert.equal(audit.isTruncated, false);
  });

  test("captures truncation notices and runtime warnings", () => {
    const tracker = new CoverageTracker("run_002", "owner/huge-monorepo", "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5");

    tracker.recordScanMetrics({
      totalFilesScanned: 2500,
      filesExcludedByDenylist: 1000,
      eligibleFilesCount: 1500,
      totalChunksIndexed: 3000,
      isTruncated: true,
      truncationNotice: "Max scan limit of 2,000 files reached",
      warnings: ["Rate limit low: 5 requests remaining"],
    });

    tracker.addWarning("Partial repository coverage warning");

    const audit = tracker.finalizeAudit();

    assert.equal(audit.isTruncated, true);
    assert.equal(audit.truncationNotice, "Max scan limit of 2,000 files reached");
    assert.equal(audit.warnings.length, 2);
    assert.ok(audit.warnings.includes("Partial repository coverage warning"));
  });
});
