import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolveAssessmentStatus } from "./statusRules.js";
import type { Citation, Requirement } from "@parakh/contracts";

describe("Conservative Status Assignment & Downgrade Rules", () => {
  const requirement: Requirement = {
    id: "req_auth",
    text: "Implement OAuth2 login with JWT tokens",
    category: "backend",
    priority: "mandatory",
  };

  const docCitation: Citation = {
    candidateId: "cand_001",
    repository: "org/repo",
    commitSha: "sha1",
    path: "README.md",
    canonicalUrl: "https://github.com/org/repo/blob/sha1/README.md",
    snippet: "# OAuth2\nWe support OAuth2.",
    evidenceType: "doc",
  };

  const codeCitation: Citation = {
    candidateId: "cand_002",
    repository: "org/repo",
    commitSha: "sha1",
    path: "src/auth.ts",
    canonicalUrl: "https://github.com/org/repo/blob/sha1/src/auth.ts",
    snippet: "export function verifyOAuthToken() { ... }",
    evidenceType: "source",
  };

  test("downgrades demonstrated to partially_demonstrated when citations are doc-only", () => {
    const outcome = resolveAssessmentStatus({
      requirement,
      proposedStatus: "demonstrated",
      proposedRationale: "README mentions OAuth2",
      validationOutcome: {
        validCitations: [docCitation],
        rejectedCitations: [],
        allValid: true,
        validCount: 1,
        rejectedCount: 0,
      },
      candidateUniverseCount: 1,
    });

    assert.equal(outcome.finalStatus, "partially_demonstrated");
    assert.equal(outcome.wasDowngraded, true);
    assert.match(outcome.downgradeReason || "", /exclusively of documentation claims/i);
  });

  test("downgrades demonstrated to needs_review when citations fail validation", () => {
    const outcome = resolveAssessmentStatus({
      requirement,
      proposedStatus: "demonstrated",
      proposedRationale: "Model claims it works",
      validationOutcome: {
        validCitations: [], // 0 valid
        rejectedCitations: [
          { candidateId: "cand_ghost", code: "HALLUCINATED_CANDIDATE_ID", reason: "Ghost" },
        ],
        allValid: false,
        validCount: 0,
        rejectedCount: 1,
      },
      candidateUniverseCount: 2,
    });

    assert.equal(outcome.finalStatus, "needs_review");
    assert.equal(outcome.wasDowngraded, true);
    assert.match(outcome.downgradeReason || "", /zero verifiable citations/i);
  });

  test("maintains demonstrated status when verified code citations exist", () => {
    const outcome = resolveAssessmentStatus({
      requirement,
      proposedStatus: "demonstrated",
      proposedRationale: "OAuth service implemented and tested",
      validationOutcome: {
        validCitations: [codeCitation],
        rejectedCitations: [],
        allValid: true,
        validCount: 1,
        rejectedCount: 0,
      },
      candidateUniverseCount: 2,
    });

    assert.equal(outcome.finalStatus, "demonstrated");
    assert.equal(outcome.wasDowngraded, false);
    assert.equal(outcome.downgradeReason, undefined);
  });

  test("formats not_demonstrated with objective non-judgmental phrasing when 0 candidates found", () => {
    const outcome = resolveAssessmentStatus({
      requirement,
      proposedStatus: "not_demonstrated",
      proposedRationale: "",
      validationOutcome: {
        validCitations: [],
        rejectedCitations: [],
        allValid: true,
        validCount: 0,
        rejectedCount: 0,
      },
      candidateUniverseCount: 0,
    });

    assert.equal(outcome.finalStatus, "not_demonstrated");
    assert.match(outcome.finalRationale, /Not found in supplied repository evidence/i);
  });
});
