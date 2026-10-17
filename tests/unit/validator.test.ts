import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CitationValidator } from "../../packages/assessment/src/validator.js";
import type { CandidateSnippet, EvidenceRecord } from "@parakh/contracts";

describe("Unit: CitationValidator Suite", () => {
  const validator = new CitationValidator();

  const mockRecords: EvidenceRecord[] = [
    {
      id: "rec-1",
      repository: "org/repo",
      commitSha: "abc1234",
      path: "src/auth/jwt.ts",
      canonicalUrl: "https://github.com/org/repo/blob/abc1234/src/auth/jwt.ts",
      fileType: "source",
      lineCount: 150,
      content: "export function signToken(payload: object) {\n  return jwt.sign(payload, secret);\n}",
      ingestionStatus: "full",
    },
    {
      id: "rec-2",
      repository: "org/repo",
      commitSha: "abc1234",
      path: "tests/auth/jwt.test.ts",
      canonicalUrl: "https://github.com/org/repo/blob/abc1234/tests/auth/jwt.test.ts",
      fileType: "test",
      lineCount: 80,
      content: "test('sign token', () => {});",
      ingestionStatus: "full",
    },
  ];

  const mockUniverse: CandidateSnippet[] = [
    {
      candidateId: "cand-jwt-valid",
      fileId: "rec-1",
      repository: "org/repo",
      commitSha: "abc1234",
      path: "src/auth/jwt.ts",
      startLine: 1,
      endLine: 3,
      content: "export function signToken(payload: object) {\n  return jwt.sign(payload, secret);\n}",
      canonicalUrl: "https://github.com/org/repo/blob/abc1234/src/auth/jwt.ts#L1-L3",
      fileType: "source",
    },
    {
      candidateId: "cand-out-of-bounds",
      fileId: "rec-1",
      repository: "org/repo",
      commitSha: "abc1234",
      path: "src/auth/jwt.ts",
      startLine: 200,
      endLine: 250, // file only has 150 lines
      content: "phantom logic",
      canonicalUrl: "https://github.com/org/repo/blob/abc1234/src/auth/jwt.ts#L200-L250",
      fileType: "source",
    },
    {
      candidateId: "cand-empty",
      fileId: "rec-1",
      repository: "org/repo",
      commitSha: "abc1234",
      path: "src/auth/jwt.ts",
      startLine: 30,
      endLine: 30,
      content: "   ",
      canonicalUrl: "https://github.com/org/repo/blob/abc1234/src/auth/jwt.ts#L30-L30",
      fileType: "source",
    },
  ];

  it("approves legitimate citations matching bounded candidates and repository files", () => {
    const outcome = validator.validate(["cand-jwt-valid"], mockUniverse, mockRecords);
    assert.equal(outcome.allValid, true);
    assert.equal(outcome.validCount, 1);
    assert.equal(outcome.rejectedCount, 0);
    assert.equal(outcome.validCitations[0].candidateId, "cand-jwt-valid");
  });

  it("strictly rejects hallucinated candidate IDs not present in retrieval universe", () => {
    const outcome = validator.validate(["cand-ghost-id"], mockUniverse, mockRecords);
    assert.equal(outcome.allValid, false);
    assert.equal(outcome.rejectedCount, 1);
    assert.equal(outcome.rejectedCitations[0].code, "HALLUCINATED_CANDIDATE_ID");
  });

  it("strictly rejects line ranges that exceed file bounds", () => {
    const outcome = validator.validate(["cand-out-of-bounds"], mockUniverse, mockRecords);
    assert.equal(outcome.allValid, false);
    assert.equal(outcome.rejectedCount, 1);
    assert.equal(outcome.rejectedCitations[0].code, "INVALID_LINE_RANGE");
  });

  it("strictly rejects whitespace-only or empty candidate snippets", () => {
    const outcome = validator.validate(["cand-empty"], mockUniverse, mockRecords);
    assert.equal(outcome.allValid, false);
    assert.equal(outcome.rejectedCount, 1);
    assert.equal(outcome.rejectedCitations[0].code, "EMPTY_SNIPPET");
  });
});
