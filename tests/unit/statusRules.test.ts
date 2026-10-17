import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveAssessmentStatus } from "../../packages/assessment/src/statusRules.js";
import type { Requirement, Citation } from "@parakh/contracts";

describe("Unit: Assessment Status Downgrade Rules", () => {
  const sampleReq: Requirement = {
    id: "req-1",
    title: "Fastify REST Endpoint",
    description: "Build robust Fastify REST APIs with schema validation",
    category: "backend",
    importance: "must_have",
  };

  const sampleDocCitation: Citation = {
    candidateId: "cand-doc-1",
    canonicalUrl: "https://github.com/org/repo/blob/sha/README.md#L10-L15",
    path: "README.md",
    lineStart: 10,
    lineEnd: 15,
    evidenceType: "doc",
    confidence: 0.9,
    relevanceSummary: "Architecture claim in README",
  };

  const sampleCodeCitation: Citation = {
    candidateId: "cand-code-1",
    canonicalUrl: "https://github.com/org/repo/blob/sha/src/routes.ts#L20-L45",
    path: "src/routes.ts",
    lineStart: 20,
    lineEnd: 45,
    evidenceType: "code",
    confidence: 0.95,
    relevanceSummary: "Fastify route implementation",
  };

  it("downgrades to not_demonstrated when candidate universe count is 0", () => {
    const res = resolveAssessmentStatus({
      requirement: sampleReq,
      proposedStatus: "demonstrated",
      proposedRationale: "Model guessed candidate has this skill",
      validationOutcome: {
        validCitations: [],
        rejectedCitations: [],
        allValid: true,
        validCount: 0,
        rejectedCount: 0,
      },
      candidateUniverseCount: 0,
    });

    assert.equal(res.finalStatus, "not_demonstrated");
    assert.equal(res.wasDowngraded, true);
    assert.ok(res.downgradeReason?.includes("no candidate snippets"));
  });

  it("downgrades positive claims to needs_review when zero valid citations exist", () => {
    const res = resolveAssessmentStatus({
      requirement: sampleReq,
      proposedStatus: "demonstrated",
      proposedRationale: "Model claims demonstrated without evidence",
      validationOutcome: {
        validCitations: [],
        rejectedCitations: [{ candidateId: "fake", code: "HALLUCINATED_CANDIDATE_ID", reason: "Not found" }],
        allValid: false,
        validCount: 0,
        rejectedCount: 1,
      },
      candidateUniverseCount: 5,
    });

    assert.equal(res.finalStatus, "needs_review");
    assert.equal(res.wasDowngraded, true);
    assert.ok(res.downgradeReason?.includes("zero verifiable citations"));
  });

  it("downgrades doc-only evidence from demonstrated to partially_demonstrated", () => {
    const res = resolveAssessmentStatus({
      requirement: sampleReq,
      proposedStatus: "demonstrated",
      proposedRationale: "README describes Fastify endpoint architecture",
      validationOutcome: {
        validCitations: [sampleDocCitation],
        rejectedCitations: [],
        allValid: true,
        validCount: 1,
        rejectedCount: 0,
      },
      candidateUniverseCount: 5,
    });

    assert.equal(res.finalStatus, "partially_demonstrated");
    assert.equal(res.wasDowngraded, true);
    assert.ok(res.downgradeReason?.includes("documentation claims without verifiable code"));
  });

  it("preserves demonstrated status when verified code citation is present", () => {
    const res = resolveAssessmentStatus({
      requirement: sampleReq,
      proposedStatus: "demonstrated",
      proposedRationale: "Route is implemented with schema validation",
      validationOutcome: {
        validCitations: [sampleCodeCitation],
        rejectedCitations: [],
        allValid: true,
        validCount: 1,
        rejectedCount: 0,
      },
      candidateUniverseCount: 5,
    });

    assert.equal(res.finalStatus, "demonstrated");
    assert.equal(res.wasDowngraded, false);
    assert.equal(res.verifiedCitations.length, 1);
  });
});
