import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  resolveAssessmentStatus,
  isDocOnlyCitations,
  isConfigOnlyCitations,
} from "./scoringRules.js";
import type { Citation, Requirement } from "@parakh/contracts";

describe("Scoring Rules & Conservative Status Downgrades", () => {
  const req: Requirement = {
    id: "req_api",
    text: "Implement rate-limited REST API endpoint",
    category: "backend",
    priority: "mandatory",
  };

  const codeCitation: Citation = {
    candidateId: "cand_001",
    repository: "owner/repo",
    commitSha: "a".repeat(40),
    path: "src/api.ts",
    canonicalUrl: "https://github.com/owner/repo/blob/sha/src/api.ts",
    snippet: "export function handleApi() {}",
    evidenceType: "source",
  };

  const configCitation: Citation = {
    candidateId: "cand_002",
    repository: "owner/repo",
    commitSha: "a".repeat(40),
    path: "docker-compose.yml",
    canonicalUrl: "https://github.com/owner/repo/blob/sha/docker-compose.yml",
    snippet: "services: api:",
    evidenceType: "config",
  };

  const docCitation: Citation = {
    candidateId: "cand_003",
    repository: "owner/repo",
    commitSha: "a".repeat(40),
    path: "README.md",
    canonicalUrl: "https://github.com/owner/repo/blob/sha/README.md",
    snippet: "# API Documentation",
    evidenceType: "doc",
  };

  test("helper functions detect doc-only and config-only citation sets", () => {
    assert.equal(isDocOnlyCitations([docCitation]), true);
    assert.equal(isDocOnlyCitations([docCitation, codeCitation]), false);
    assert.equal(isConfigOnlyCitations([configCitation]), true);
    assert.equal(isConfigOnlyCitations([configCitation, codeCitation]), false);
  });

  test("config-only citations downgrade demonstrated to partially_demonstrated", () => {
    const outcome = resolveAssessmentStatus({
      requirement: req,
      proposedStatus: "demonstrated",
      proposedRationale: "Docker compose specifies API service",
      validationOutcome: {
        validCitations: [configCitation],
        rejectedCitations: [],
        allValid: true,
        validCount: 1,
        rejectedCount: 0,
      },
      candidateUniverseCount: 1,
    });

    assert.equal(outcome.finalStatus, "partially_demonstrated");
    assert.equal(outcome.wasDowngraded, true);
    assert.match(outcome.downgradeReason || "", /manifest or configuration/i);
  });

  test("zero candidates force not_demonstrated with objective non-judgmental wording", () => {
    const outcome = resolveAssessmentStatus({
      requirement: req,
      proposedStatus: "demonstrated",
      proposedRationale: "Hallucinated claim",
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
    assert.equal(outcome.wasDowngraded, true);
    assert.match(outcome.finalRationale, /not found in supplied repository evidence/i);
  });

  test("unverified citations downgrade positive claims to needs_review", () => {
    const outcome = resolveAssessmentStatus({
      requirement: req,
      proposedStatus: "demonstrated",
      proposedRationale: "Claim without verifiable citation",
      validationOutcome: {
        validCitations: [],
        rejectedCitations: [
          { candidateId: "cand_999", code: "HALLUCINATED_CANDIDATE_ID", reason: "Ghost" },
        ],
        allValid: false,
        validCount: 0,
        rejectedCount: 1,
      },
      candidateUniverseCount: 1,
    });

    assert.equal(outcome.finalStatus, "needs_review");
    assert.equal(outcome.wasDowngraded, true);
  });

  test("verified code citation maintains demonstrated status", () => {
    const outcome = resolveAssessmentStatus({
      requirement: req,
      proposedStatus: "demonstrated",
      proposedRationale: "Verified implementation in src/api.ts",
      validationOutcome: {
        validCitations: [codeCitation],
        rejectedCitations: [],
        allValid: true,
        validCount: 1,
        rejectedCount: 0,
      },
      candidateUniverseCount: 1,
    });

    assert.equal(outcome.finalStatus, "demonstrated");
    assert.equal(outcome.wasDowngraded, false);
    assert.equal(outcome.verifiedCitations.length, 1);
  });
});
