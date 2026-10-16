import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { AssessmentWorkflow } from "./assessmentWorkflow.js";
import type { EvidenceRecord, Requirement } from "@parakh/contracts";

describe("Mastra Typed Assessment Workflow", () => {
  const commitSha = "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5";

  const records: EvidenceRecord[] = [
    {
      id: "ev_jwt",
      repository: "org/repo",
      commitSha,
      path: "src/auth/jwt.ts",
      canonicalUrl: `https://github.com/org/repo/blob/${commitSha}/src/auth/jwt.ts`,
      fileType: "source",
      lineCount: 25,
      content: "export function verifyJwtToken(token: string) { return true; }",
      ingestionStatus: "full",
    },
  ];

  const requirements: Requirement[] = [
    {
      id: "req_1",
      text: "JWT token authentication verification",
      category: "backend",
      priority: "mandatory",
    },
    {
      id: "req_2",
      text: "Kubernetes helm chart deployments",
      category: "devops",
      priority: "preferred",
    },
  ];

  test("executes end-to-end evaluation pipeline with telemetry and summary metrics", async () => {
    const workflow = new AssessmentWorkflow();
    const output = await workflow.execute({
      runId: "run_test_1",
      opportunityId: "opp_1",
      repositoryUrl: "https://github.com/org/repo",
      commitSha,
      requirements,
      records,
    });

    assert.equal(output.runId, "run_test_1");
    assert.equal(output.report.status, "completed");
    assert.equal(output.report.assessments.length, 2);

    // req_1 had evidence
    const req1Assessment = output.report.assessments.find((a) => a.requirementId === "req_1")!;
    assert.ok(req1Assessment);
    assert.equal(req1Assessment.status, "demonstrated");
    assert.ok(req1Assessment.citations.length > 0);

    // req_2 had zero evidence -> not_demonstrated short-circuit
    const req2Assessment = output.report.assessments.find((a) => a.requirementId === "req_2")!;
    assert.ok(req2Assessment);
    assert.equal(req2Assessment.status, "not_demonstrated");

    // Telemetries captured
    assert.ok(output.stepTelemetries.length >= 4);
    assert.ok(output.totalDurationMs >= 0);
  });
});
