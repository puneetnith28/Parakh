import test from "node:test";
import assert from "node:assert/strict";
import { RunManager } from "./runManager.js";

test("RunManager enforces strict sequential state transitions", () => {
  const manager = new RunManager();

  const { run } = manager.createOrGetRun({
    runId: "run_seq_1",
    opportunityId: "opp_1",
    repositoryUrl: "https://github.com/owner/repo",
  });
  assert.equal(run.status, "INITIALIZED");

  // Legal transitions: INITIALIZED -> INGESTING_REPO -> RETRIEVING_CHUNKS -> ASSESSING -> COMPLETED
  manager.transitionState("run_seq_1", "INGESTING_REPO");
  assert.equal(manager.getRun("run_seq_1")?.status, "INGESTING_REPO");

  manager.transitionState("run_seq_1", "RETRIEVING_CHUNKS");
  assert.equal(manager.getRun("run_seq_1")?.status, "RETRIEVING_CHUNKS");

  manager.transitionState("run_seq_1", "ASSESSING");
  assert.equal(manager.getRun("run_seq_1")?.status, "ASSESSING");

  manager.transitionState("run_seq_1", "COMPLETED", { reportId: "rep_100" });
  const finalRun = manager.getRun("run_seq_1");
  assert.equal(finalRun?.status, "COMPLETED");
  assert.equal(finalRun?.reportId, "rep_100");
  assert.equal(finalRun?.history.length, 5);

  // Illegal transition: Terminal state cannot transition anywhere
  assert.throws(() => {
    manager.transitionState("run_seq_1", "ASSESSING");
  }, /Invalid state transition/);
});

test("RunManager idempotency guard deduplicates requests presenting identical key", () => {
  const manager = new RunManager();

  const idempotencyKey = "client-req-uuid-999";

  const firstCall = manager.createOrGetRun({
    runId: "run_first",
    opportunityId: "opp_1",
    repositoryUrl: "https://github.com/owner/repo",
    idempotencyKey,
  });
  assert.equal(firstCall.isNew, true);
  assert.equal(firstCall.run.runId, "run_first");

  // Re-submitting with identical idempotency key returns the existing run
  const secondCall = manager.createOrGetRun({
    runId: "run_second_attempt",
    opportunityId: "opp_1",
    repositoryUrl: "https://github.com/owner/repo",
    idempotencyKey,
  });
  assert.equal(secondCall.isNew, false);
  assert.equal(secondCall.run.runId, "run_first"); // Returns original run
});
