import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  EvidenceStatusSchema,
  ModelAssessmentOutputSchema,
  RequirementAssessmentSchema,
} from "./assessment.js";

describe("Assessment Output Schema & Status Contract", () => {
  test("validates all 4 supported EvidenceStatus enum values", () => {
    assert.equal(EvidenceStatusSchema.parse("demonstrated"), "demonstrated");
    assert.equal(EvidenceStatusSchema.parse("partially_demonstrated"), "partially_demonstrated");
    assert.equal(EvidenceStatusSchema.parse("not_demonstrated"), "not_demonstrated");
    assert.equal(EvidenceStatusSchema.parse("needs_review"), "needs_review");

    assert.throws(() => EvidenceStatusSchema.parse("proven"));
    assert.throws(() => EvidenceStatusSchema.parse("failed"));
  });

  test("parses valid ModelAssessmentOutput payloads", () => {
    const valid = {
      requirementId: "req_001",
      status: "demonstrated",
      rationale: "Implementation verified in auth/jwt.ts",
      citedCandidateIds: ["cand_001", "cand_002"],
      limitations: "No token revocation endpoint found",
      nextActions: ["Add Redis token denylist"],
    };

    const parsed = ModelAssessmentOutputSchema.parse(valid);
    assert.equal(parsed.requirementId, "req_001");
    assert.equal(parsed.status, "demonstrated");
    assert.equal(parsed.citedCandidateIds.length, 2);
  });

  test("rejects ambiguous or missing status values", () => {
    const invalid = {
      requirementId: "req_001",
      status: "maybe",
      rationale: "Unclear evidence",
    };

    assert.throws(() => ModelAssessmentOutputSchema.parse(invalid));
  });

  test("RequirementAssessmentSchema parses full verified record with downgrade metadata", () => {
    const full = {
      requirementId: "req_001",
      requirementText: "GraphQL API",
      status: "partially_demonstrated",
      rationale: "Schema exists without resolvers",
      citedCandidateIds: ["cand_001"],
      citations: [
        {
          candidateId: "cand_001",
          repository: "org/repo",
          commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
          path: "schema.graphql",
          canonicalUrl: "https://github.com/org/repo/blob/sha/schema.graphql",
          snippet: "type Query { me: User }",
        },
      ],
      downgradeReason: "Downgraded from demonstrated: only schema definitions found without working resolvers",
      nextActions: ["Implement resolver functions"],
    };

    const parsed = RequirementAssessmentSchema.parse(full);
    assert.equal(parsed.status, "partially_demonstrated");
    assert.ok(parsed.downgradeReason);
  });
});
