import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CandidateSelector } from "./candidateSelector.js";
import type { EvidenceRecord, Requirement } from "@parakh/contracts";

describe("Per-Requirement Candidate Selection Pipeline", () => {
  const records: EvidenceRecord[] = [
    {
      id: "ev_jwt",
      repository: "org/repo",
      commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
      path: "src/auth/jwt.ts",
      canonicalUrl: "https://github.com/org/repo/blob/sha/src/auth/jwt.ts",
      fileType: "source",
      lineCount: 40,
      content: "export function verifyJwtToken(token: string) { return true; }",
      ingestionStatus: "full",
    },
    {
      id: "ev_test_jwt",
      repository: "org/repo",
      commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
      path: "tests/jwt.test.ts",
      canonicalUrl: "https://github.com/org/repo/blob/sha/tests/jwt.test.ts",
      fileType: "test",
      lineCount: 30,
      content: "test('validates valid jwt', () => { expect(verifyJwtToken('abc')).toBe(true); });",
      ingestionStatus: "full",
    },
    {
      id: "ev_doc",
      repository: "org/repo",
      commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
      path: "docs/auth.md",
      canonicalUrl: "https://github.com/org/repo/blob/sha/docs/auth.md",
      fileType: "doc",
      lineCount: 20,
      content: "We use JWT tokens for authentication.",
      ingestionStatus: "full",
    },
  ];

  const repoIndex = {
    repository: "org/repo",
    commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
    records,
    totalFiles: 3,
    indexedAt: new Date().toISOString(),
  };

  test("selects prioritized candidates with sequential cand_001 IDs", () => {
    const requirement: Requirement = {
      id: "req_auth",
      text: "Implement JWT authentication token verification",
      category: "backend",
      priority: "mandatory",
    };

    const selector = new CandidateSelector({ maxCandidates: 3 });
    const universe = selector.selectCandidates(requirement, repoIndex);

    assert.equal(universe.requirementId, "req_auth");
    assert.ok(universe.candidateCount >= 2);
    assert.equal(universe.candidates[0].candidateId, "cand_001");
    assert.equal(universe.candidates[1].candidateId, "cand_002");

    // Test file should be ranked #1 due to 1.5x test weighting
    assert.equal(universe.candidates[0].path, "tests/jwt.test.ts");
    assert.equal(universe.candidates[0].fileType, "test");
  });

  test("strictly enforces token budget limits", () => {
    const requirement: Requirement = {
      id: "req_auth",
      text: "JWT token verification",
      category: "backend",
      priority: "mandatory",
    };

    // Strict token budget of 50 tokens
    const selector = new CandidateSelector({ maxCandidates: 10, maxTotalTokens: 50 });
    const universe = selector.selectCandidates(requirement, repoIndex);

    assert.ok(universe.totalTokensEstimated <= 50 || universe.candidateCount === 1);
  });
});
