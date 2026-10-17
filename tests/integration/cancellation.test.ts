import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../../apps/api/src/server.js";
import { runManager } from "../../apps/api/src/services/runManager.js";
import { setStorage, MemoryReportStorage } from "../../apps/api/src/storage/index.js";

describe("Server-Side Analysis Run Cancellation (Stage 8)", () => {
  let server: http.Server;
  const PORT = 3099;
  const BASE_URL = `http://localhost:${PORT}`;

  before(async () => {
    setStorage(new MemoryReportStorage());
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(PORT, resolve));
  });

  after(() => {
    server.close();
    runManager.clear();
  });

  it("returns 404 when attempting to cancel a non-existent run", async () => {
    const res = await fetch(`${BASE_URL}/api/analysis/non_existent_run_123/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "User cancelled" }),
    });
    assert.equal(res.status, 404);
  });

  it("dispatches cancellation signal for an active run", async () => {
    const runId = "run_to_cancel_001";
    runManager.createOrGetRun({
      runId,
      opportunityId: "opp_1",
      repositoryUrl: "https://github.com/owner/repo",
    });

    const res = await fetch(`${BASE_URL}/api/analysis/${runId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "User clicked stop in UI" }),
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.status, "success");
    assert.equal(json.runId, runId);
    assert.equal(json.cancelled, true);

    // Verify RunManager records cancelled state
    assert.equal(runManager.isCancelled(runId), true);
    const run = runManager.getRun(runId);
    assert.equal(run?.status, "CANCELLED");
    assert.equal(run?.cancellationReason, "User clicked stop in UI");
  });

  it("rejects cancellation of a completed run with 400", async () => {
    const runId = "run_completed_002";
    runManager.createOrGetRun({
      runId,
      opportunityId: "opp_2",
      repositoryUrl: "https://github.com/owner/repo",
    });
    runManager.transitionState(runId, "COMPLETED", { reportId: "rep_002" });

    const res = await fetch(`${BASE_URL}/api/analysis/${runId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    assert.equal(res.status, 400);
    const json = (await res.json()) as any;
    assert.match(json.message, /already completed/);
  });
});
