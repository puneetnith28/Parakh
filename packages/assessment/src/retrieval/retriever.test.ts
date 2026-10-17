import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { UnifiedEvidenceRetriever, extractCodeSymbols } from "./retriever.js";
import type { EvidenceRecord, Requirement } from "@parakh/contracts";

describe("Unified Evidence Retrieval and Ranking Engine", () => {
  const sampleRecords: EvidenceRecord[] = [
    {
      id: "rec_auth_test",
      repository: "acme/backend",
      commitSha: "1234567890abcdef1234567890abcdef12345678",
      path: "tests/auth/jwt.test.ts",
      canonicalUrl: "https://github.com/acme/backend/blob/1234567890abcdef1234567890abcdef12345678/tests/auth/jwt.test.ts",
      fileType: "test",
      lineCount: 40,
      content: `import { verifyToken } from '../../src/auth/jwt';
describe('JWT Authentication Verification', () => {
  it('should verify valid bearer token', () => {
    const res = verifyToken('valid.jwt.token');
    expect(res.valid).toBe(true);
  });
});`,
      ingestionStatus: "full",
    },
    {
      id: "rec_auth_src",
      repository: "acme/backend",
      commitSha: "1234567890abcdef1234567890abcdef12345678",
      path: "src/auth/jwt.ts",
      canonicalUrl: "https://github.com/acme/backend/blob/1234567890abcdef1234567890abcdef12345678/src/auth/jwt.ts",
      fileType: "source",
      lineCount: 35,
      content: `export function verifyToken(token: string) {
  if (!token) throw new Error("Missing token");
  return { valid: true, payload: { userId: "usr_1" } };
}`,
      ingestionStatus: "full",
    },
    {
      id: "rec_auth_doc",
      repository: "acme/backend",
      commitSha: "1234567890abcdef1234567890abcdef12345678",
      path: "docs/architecture/auth.md",
      canonicalUrl: "https://github.com/acme/backend/blob/1234567890abcdef1234567890abcdef12345678/docs/architecture/auth.md",
      fileType: "doc",
      lineCount: 20,
      content: `# Authentication System
We use JWT bearer tokens for API authentication and verification.`,
      ingestionStatus: "full",
    },
    {
      id: "rec_db_src",
      repository: "acme/backend",
      commitSha: "1234567890abcdef1234567890abcdef12345678",
      path: "src/db/connection.ts",
      canonicalUrl: "https://github.com/acme/backend/blob/1234567890abcdef1234567890abcdef12345678/src/db/connection.ts",
      fileType: "source",
      lineCount: 15,
      content: `export function connectDatabase(uri: string) { return true; }`,
      ingestionStatus: "full",
    },
  ];

  const repoIndex = {
    repository: "acme/backend",
    commitSha: "1234567890abcdef1234567890abcdef12345678",
    records: sampleRecords,
    totalFiles: sampleRecords.length,
    indexedAt: new Date().toISOString(),
  };

  test("extractCodeSymbols extracts functions, tests, classes, and routes", () => {
    const code = `
export function verifyToken(token: string) {}
export class AuthService {}
router.get('/api/auth', handler);
test('verifies credentials', () => {});
`;
    const symbols = extractCodeSymbols(code);
    assert.ok(symbols.some((s) => s.name === "verifyToken" && s.kind === "function"));
    assert.ok(symbols.some((s) => s.name === "AuthService" && s.kind === "class"));
    assert.ok(symbols.some((s) => s.name === "/api/auth" && s.kind === "route"));
    assert.ok(symbols.some((s) => s.name === "verifies credentials" && s.kind === "test"));
  });

  test("retrieves top-ranked candidates bounded to max candidates with sequential cand_001 IDs", async () => {
    const requirement: Requirement = {
      id: "req_jwt_auth",
      text: "Implement JWT authentication token verification",
      category: "backend",
      priority: "mandatory",
    };

    const retriever = new UnifiedEvidenceRetriever();
    const result = await retriever.retrieveEvidence(requirement, repoIndex, { topK: 3 });

    assert.equal(result.requirementId, "req_jwt_auth");
    assert.equal(result.strategyUsed, "hybrid");
    assert.ok(result.candidates.length > 0 && result.candidates.length <= 3);

    // Verify sequential candidate IDs
    assert.equal(result.candidates[0].candidate.candidateId, "cand_001");
    if (result.candidates.length > 1) {
      assert.equal(result.candidates[1].candidate.candidateId, "cand_002");
    }

    // Verify candidate paths match the topic (auth/jwt)
    const topPath = result.candidates[0].candidate.path;
    assert.ok(topPath.includes("jwt"), `Expected top path to contain 'jwt', got: ${topPath}`);
  });

  test("retrieveBatch produces structured candidate universes for all requirements", async () => {
    const requirements: Requirement[] = [
      {
        id: "req_1",
        text: "JWT token verification",
        category: "backend",
        priority: "mandatory",
      },
      {
        id: "req_2",
        text: "PostgreSQL database connection pool",
        category: "backend",
        priority: "preferred",
      },
    ];

    const retriever = new UnifiedEvidenceRetriever();
    const universes = await retriever.retrieveBatch(requirements, repoIndex);

    assert.equal(universes.length, 2);
    assert.equal(universes[0].requirementId, "req_1");
    assert.ok(universes[0].candidateCount > 0);
    assert.equal(universes[1].requirementId, "req_2");
  });
});
