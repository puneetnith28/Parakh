import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CanonicalAssessmentEvaluator } from "./evaluator.js";
import type { Requirement, EvidenceRecord } from "@parakh/contracts";

describe("CanonicalAssessmentEvaluator Unit Suite", () => {
  const evaluator = new CanonicalAssessmentEvaluator();

  const mockRequirements: Requirement[] = [
    {
      id: "req_auth",
      text: "JWT authentication with refresh tokens",
      category: "security",
      priority: "mandatory",
    },
    {
      id: "req_db",
      text: "PostgreSQL database migrations",
      category: "database",
      priority: "mandatory",
    },
  ];

  const mockRecords: EvidenceRecord[] = [
    {
      id: "ev_1",
      repository: "owner/repo",
      commitSha: "1234567890abcdef1234567890abcdef12345678",
      path: "src/auth/jwt.ts",
      canonicalUrl: "https://github.com/owner/repo/blob/123/src/auth/jwt.ts",
      fileType: "source",
      lineCount: 50,
      content: "export function verifyJwt(token: string) { return jwt.verify(token); }",
      ingestionStatus: "full",
    },
    {
      id: "ev_2",
      repository: "owner/repo",
      commitSha: "1234567890abcdef1234567890abcdef12345678",
      path: "tests/auth/jwt.test.ts",
      canonicalUrl: "https://github.com/owner/repo/blob/123/tests/auth/jwt.test.ts",
      fileType: "test",
      lineCount: 30,
      content: "test('verifies valid jwt', () => { assert.ok(verifyJwt('abc')); });",
      ingestionStatus: "full",
    },
  ];

  test("evaluates requirements with verified code and tests as demonstrated", async () => {
    const results = await evaluator.evaluateBatch(mockRequirements, mockRecords);
    assert.equal(results.length, 2);

    const authAssessment = results.find((r) => r.requirementId === "req_auth");
    assert.ok(authAssessment);
    assert.equal(authAssessment.status, "demonstrated");
    assert.ok(authAssessment.citations.length > 0);
  });

  test("evaluates unmentioned requirements with zero candidates as not_demonstrated", async () => {
    const results = await evaluator.evaluateBatch(mockRequirements, mockRecords);
    const dbAssessment = results.find((r) => r.requirementId === "req_db");
    assert.ok(dbAssessment);
    assert.equal(dbAssessment.status, "not_demonstrated");
    assert.equal(dbAssessment.citations.length, 0);
  });
});
