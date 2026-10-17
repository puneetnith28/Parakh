import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AssessmentDurableWorkflow,
  DEFAULT_ACTIVITY_RETRY_POLICY,
  WORKFLOW_ACTIVITIES,
} from "./workflow.js";

describe("AssessmentDurableWorkflow", () => {
  const sampleInput = {
    assessmentId: "test-assess-123",
    candidateId: "cand-456",
    repoUrl: "https://github.com/example/repo",
    idempotencyKey: "idem-key-789",
  };

  it("initializes with pending state and valid IDs", () => {
    const wf = new AssessmentDurableWorkflow(sampleInput);
    const state = wf.getState();

    assert.equal(state.status, "PENDING");
    assert.equal(state.workflowId, "parakh-assessment-test-assess-123");
    assert.ok(state.runId.startsWith("run-"));
    assert.equal(state.completedSteps.length, 0);
  });

  it("transitions through running and completed states", async () => {
    const wf = new AssessmentDurableWorkflow(sampleInput);

    const stepResult = await wf.executeStep(WORKFLOW_ACTIVITIES.CLONE_AND_INSPECT, async () => {
      return { filesScanned: 42 };
    });

    assert.equal(stepResult.filesScanned, 42);
    let state = wf.getState();
    assert.equal(state.status, "RUNNING");
    assert.deepEqual(state.completedSteps, [WORKFLOW_ACTIVITIES.CLONE_AND_INSPECT]);

    wf.completeWorkflow();
    state = wf.getState();
    assert.equal(state.status, "COMPLETED");
  });

  it("handles step failure and sets failed status", async () => {
    const wf = new AssessmentDurableWorkflow(sampleInput);

    await assert.rejects(
      async () => {
        await wf.executeStep(WORKFLOW_ACTIVITIES.EXTRACT_AST_AND_METRICS, async () => {
          throw new Error("Syntax error in source AST");
        });
      },
      { message: "Syntax error in source AST" }
    );

    const state = wf.getState();
    assert.equal(state.status, "FAILED");
    assert.equal(state.error, "Syntax error in source AST");
  });

  it("exposes robust default activity retry policy with non-retryable errors", () => {
    assert.equal(DEFAULT_ACTIVITY_RETRY_POLICY.maximumAttempts, 5);
    assert.equal(DEFAULT_ACTIVITY_RETRY_POLICY.backoffCoefficient, 2.0);
    assert.ok(
      DEFAULT_ACTIVITY_RETRY_POLICY.nonRetryableErrorTypes.includes(
        "REPOSITORY_NOT_FOUND"
      )
    );
  });
});
