import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CanonicalAssessmentEvaluator } from "../../packages/assessment/src/evaluator.js";
import { AssessmentService } from "../../apps/api/src/services/assessmentService.js";
import { AssessmentWorkflow } from "../../apps/api/src/mastra/workflows/assessmentWorkflow.js";
import { GemmaClient } from "../../packages/integrations/src/gemma/client.js";
import type { Requirement, EvidenceRecord } from "@parakh/contracts";

describe("Regression: Assessment Logic Consolidation & Consistency", () => {
  const requirements: Requirement[] = [
    {
      id: "req_001",
      text: "Must implement user authentication using JWT",
      category: "security",
      priority: "mandatory",
    },
    {
      id: "req_002",
      text: "Must provide distributed GraphQL API gateway",
      category: "backend",
      priority: "mandatory",
    },
  ];

  const records: EvidenceRecord[] = [
    {
      id: "rec_1",
      repository: "acme/service",
      commitSha: "a".repeat(40),
      path: "src/auth/jwt.ts",
      canonicalUrl: "https://github.com/acme/service/blob/main/src/auth/jwt.ts",
      fileType: "source",
      lineCount: 10,
      content: "import jwt from 'jsonwebtoken';\nexport function verify(token: string) { return jwt.verify(token, 'secret'); }",
      ingestionStatus: "full",
    },
    {
      id: "rec_2",
      repository: "acme/service",
      commitSha: "a".repeat(40),
      path: "tests/auth/jwt.test.ts",
      canonicalUrl: "https://github.com/acme/service/blob/main/tests/auth/jwt.test.ts",
      fileType: "test",
      lineCount: 10,
      content: "import { verify } from '../src/auth/jwt';\ntest('verify token', () => { expect(verify).toBeDefined(); });",
      ingestionStatus: "full",
    },
  ];

  it("verifies consistent assessment status, citation validity, and coverage summary across AssessmentService and AssessmentWorkflow", async () => {
    const mockClient = new GemmaClient({ provider: "mock" });

    // Path 1: AssessmentService (used by /api/analysis)
    const assessmentService = new AssessmentService({
      gemmaClient: mockClient,
      backoffMs: 0,
    });
    const reportFromService = await assessmentService.evaluateRepository({
      runId: "run_cons_1",
      opportunityId: "opp_1",
      repositoryUrl: "https://github.com/acme/service",
      commitSha: "a".repeat(40),
      requirements,
      records,
    });

    // Path 2: AssessmentWorkflow (scaffold workflow)
    const workflow = new AssessmentWorkflow({
      gemmaClient: mockClient,
      evaluator: new CanonicalAssessmentEvaluator({ maxCandidates: 5 }),
    });
    const workflowOutput = await workflow.execute({
      runId: "run_cons_2",
      opportunityId: "opp_1",
      repositoryUrl: "https://github.com/acme/service",
      commitSha: "a".repeat(40),
      requirements,
      records,
    });
    const reportFromWorkflow = workflowOutput.report;

    // 1. Verify exact status match for each requirement
    assert.equal(reportFromService.assessments.length, reportFromWorkflow.assessments.length);
    for (let i = 0; i < requirements.length; i++) {
      const a1 = reportFromService.assessments[i];
      const a2 = reportFromWorkflow.assessments[i];
      assert.equal(a1.requirementId, a2.requirementId);
      assert.equal(a1.status, a2.status, `Status mismatch for requirement ${a1.requirementId}`);
      assert.equal(a1.citations.length, a2.citations.length, `Citation count mismatch for ${a1.requirementId}`);
      assert.equal(a1.confidence, a2.confidence, `Confidence mismatch for ${a1.requirementId}`);
      assert.equal(a1.downgradeReason, a2.downgradeReason, `Downgrade reason mismatch for ${a1.requirementId}`);
    }

    // 2. Verify coverage summary consistency
    assert.deepEqual(reportFromService.coverageSummary, reportFromWorkflow.coverageSummary);

    // 3. Verify zero-evidence requirement correctly short-circuits to not_demonstrated
    const unfulfilledAssessment = reportFromService.assessments.find((a) => a.requirementId === "req_002");
    assert.ok(unfulfilledAssessment);
    assert.equal(unfulfilledAssessment.status, "not_demonstrated");
    assert.equal(unfulfilledAssessment.citations.length, 0);
  });
});
