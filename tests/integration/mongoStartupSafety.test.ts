import test, { describe, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";
import app from "../../apps/api/src/server.js";
import { mongoConnection } from "../../apps/api/src/storage/mongodb.js";
import { getStorage, setStorage } from "../../apps/api/src/storage/index.js";
import { config } from "../../apps/api/src/config.js";
import { AssessmentReport } from "@parakh/contracts";
import { runManager } from "../../apps/api/src/services/runManager.js";
import { issueProvenanceToken, computeReportContentHash } from "../../apps/api/src/services/provenance.js";

function makeProvenancedBody(report: AssessmentReport, runId = `run_${report.id}`) {
  const contentHash = computeReportContentHash(report);
  runManager.createOrGetRun({
    runId,
    opportunityId: report.opportunityId,
    repositoryUrl: report.repositoryUrl,
  });
  runManager.transitionState(runId, "COMPLETED", {
    reportId: report.id,
    reportContentHash: contentHash,
  });
  const provenanceToken = issueProvenanceToken({
    runId,
    reportId: report.id,
    opportunityId: report.opportunityId,
    repositoryUrl: report.repositoryUrl,
    resolvedCommitSha: report.resolvedCommitSha,
    contentHash,
  });
  return { report, runId, provenanceToken };
}

describe("MongoDB Startup Safety, Storage Lifecycle, and Readiness Suite", () => {
  let server: http.Server;
  const PORT = 3097;
  const BASE_URL = `http://localhost:${PORT}`;

  const originalEnv = config.NODE_ENV;
  const originalStorageMode = process.env.STORAGE_MODE;

  before(async () => {
    // Clear any test storage override to exercise true getStorage() resolution
    setStorage(null);
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(PORT, resolve));
  });

  after(async () => {
    server.close();
    (config as any).NODE_ENV = originalEnv;
    if (originalStorageMode) {
      process.env.STORAGE_MODE = originalStorageMode;
    } else {
      delete process.env.STORAGE_MODE;
    }
    setStorage(null);
    await mongoConnection.disconnect();
    runManager.clear();
  });

  beforeEach(() => {
    setStorage(null);
  });

  afterEach(() => {
    (config as any).NODE_ENV = originalEnv;
    if (originalStorageMode) {
      process.env.STORAGE_MODE = originalStorageMode;
    } else {
      delete process.env.STORAGE_MODE;
    }
    setStorage(null);
  });

  test("1. A delayed MongoDB connection does not permit production requests to proceed using memory storage", async () => {
    (config as any).NODE_ENV = "production";
    delete process.env.STORAGE_MODE;

    // Simulate disconnected state (connection still pending / delayed)
    const originalReadyState = mongoose.connection.readyState;
    (mongoose.connection as any).readyState = 0;

    try {
      // Early call to getStorage() during delayed connection
      const storageDuringDelay = getStorage();
      assert.equal(storageDuringDelay.isPersistent(), false);

      const sampleReport: AssessmentReport = {
        id: "rep_delayed_001",
        opportunityId: "opp_delayed_1",
        repositoryUrl: "https://github.com/company/platform",
        resolvedCommitSha: "d34db33f".repeat(5),
        status: "completed",
        assessments: [],
        coverageSummary: { total: 0, demonstrated: 0, partiallyDemonstrated: 0, notDemonstrated: 0, needsReview: 0 },
        scannedFilesCount: 1,
        skippedFilesCount: 0,
        createdAt: new Date().toISOString(),
      };

      const res = await fetch(`${BASE_URL}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(makeProvenancedBody(sampleReport)),
      });

      // Must be rejected with 503 DURABLE_STORAGE_UNAVAILABLE
      assert.equal(res.status, 503);
      const body = (await res.json()) as any;
      assert.equal(body.code, "DURABLE_STORAGE_UNAVAILABLE");

      // Crucial: verify storage adapter was NOT permanently cached as memory storage!
      // When connection completes (readyState = 1), getStorage() immediately yields MongoReportStorage
      (mongoose.connection as any).readyState = 1;
      const storageAfterConnect = getStorage();
      assert.equal(storageAfterConnect.getMode(), "mongodb");
      assert.equal(storageAfterConnect.isPersistent(), true);
    } finally {
      (mongoose.connection as any).readyState = originalReadyState;
    }
  });

  test("2. A failed MongoDB connection does not silently enable in-memory production persistence", async () => {
    (config as any).NODE_ENV = "production";
    delete process.env.STORAGE_MODE;

    const originalReadyState = mongoose.connection.readyState;
    (mongoose.connection as any).readyState = 0;

    try {
      // Attempt connection to unreachable port with 0 retries
      const connected = await mongoConnection.connect("mongodb://127.0.0.1:54321/fail", 0);
      assert.equal(connected, false);

      // In production, failure must NOT silently switch to persistent mode
      const storage = getStorage();
      assert.equal(storage.isPersistent(), false);

      const sampleReport: AssessmentReport = {
        id: "rep_failed_conn_002",
        opportunityId: "opp_failed_2",
        repositoryUrl: "https://github.com/company/platform",
        resolvedCommitSha: "a".repeat(40),
        status: "completed",
        assessments: [],
        coverageSummary: { total: 0, demonstrated: 0, partiallyDemonstrated: 0, notDemonstrated: 0, needsReview: 0 },
        scannedFilesCount: 1,
        skippedFilesCount: 0,
        createdAt: new Date().toISOString(),
      };

      const res = await fetch(`${BASE_URL}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(makeProvenancedBody(sampleReport)),
      });

      assert.equal(res.status, 503);
      const json = (await res.json()) as any;
      assert.equal(json.code, "DURABLE_STORAGE_UNAVAILABLE");
    } finally {
      (mongoose.connection as any).readyState = originalReadyState;
    }
  });

  test("3. Readiness remains unsuccessful until the required database is usable (while liveness succeeds)", async () => {
    (config as any).NODE_ENV = "production";
    delete process.env.STORAGE_MODE;

    const originalReadyState = mongoose.connection.readyState;
    (mongoose.connection as any).readyState = 0;

    try {
      // Liveness probe (/healthz) succeeds because Node process is alive
      const livenessRes = await fetch(`${BASE_URL}/healthz`);
      assert.equal(livenessRes.status, 200);
      const livenessJson = (await livenessRes.json()) as any;
      assert.equal(livenessJson.status, "ok");

      // Readiness probe (/api/ready) must report degraded 503 until durable storage is usable
      const readyRes = await fetch(`${BASE_URL}/api/ready`);
      assert.equal(readyRes.status, 503);
      const readyJson = (await readyRes.json()) as any;
      assert.equal(readyJson.ready, false);
      assert.equal(readyJson.status, "degraded");
    } finally {
      (mongoose.connection as any).readyState = originalReadyState;
    }
  });

  test("4. Readiness recovers correctly when initialization succeeds", async () => {
    (config as any).NODE_ENV = "production";
    delete process.env.STORAGE_MODE;

    const originalReadyState = mongoose.connection.readyState;

    try {
      // Initial disconnected state
      (mongoose.connection as any).readyState = 0;
      const initialReady = await fetch(`${BASE_URL}/api/ready`);
      assert.equal(initialReady.status, 503);

      // Connection succeeds
      (mongoose.connection as any).readyState = 1;
      const recoveredReady = await fetch(`${BASE_URL}/api/ready`);
      assert.equal(recoveredReady.status, 200);
      const json = (await recoveredReady.json()) as any;
      assert.equal(json.ready, true);
      assert.equal(json.status, "ready");
      assert.equal(json.persisted, true);
      assert.equal(json.storageMode, "mongodb");
    } finally {
      (mongoose.connection as any).readyState = originalReadyState;
    }
  });

  test("5. Analysis and report endpoints reject unavailable durable storage without returning misleading success responses", async () => {
    (config as any).NODE_ENV = "production";
    delete process.env.STORAGE_MODE;

    const originalReadyState = mongoose.connection.readyState;
    (mongoose.connection as any).readyState = 0;

    try {
      // POST /api/reports rejected
      const reportRes = await fetch(`${BASE_URL}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report: {
            id: "rep_guard_005",
            opportunityId: "opp_g5",
            repositoryUrl: "https://github.com/company/repo",
            resolvedCommitSha: "c".repeat(40),
            status: "completed",
            assessments: [],
            coverageSummary: { total: 0, demonstrated: 0, partiallyDemonstrated: 0, notDemonstrated: 0, needsReview: 0 },
            scannedFilesCount: 1,
            skippedFilesCount: 0,
            createdAt: new Date().toISOString(),
          },
          runId: "run_g5",
          provenanceToken: "dummy_token",
        }),
      });
      assert.equal(reportRes.status, 503);
      const repJson = (await reportRes.json()) as any;
      assert.equal(repJson.code, "DURABLE_STORAGE_UNAVAILABLE");

      // GET /api/reports/:id rejected with 503 instead of misleading 404
      const getRes = await fetch(`${BASE_URL}/api/reports/rep_guard_005`, {
        headers: { "X-Report-Token": "sec_token_0000000000000000000000000000000000000000000000000000000000000000" },
      });
      assert.equal(getRes.status, 503);
      const getJson = (await getRes.json()) as any;
      assert.equal(getJson.code, "DURABLE_STORAGE_UNAVAILABLE");

      // POST /api/analysis rejected immediately with 503
      const analysisRes = await fetch(`${BASE_URL}/api/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repositoryUrl: "https://github.com/company/repo",
          requirements: [{ id: "req_1", text: "TypeScript required" }],
        }),
      });
      assert.equal(analysisRes.status, 503);
      const analysisJson = (await analysisRes.json()) as any;
      assert.equal(analysisJson.code, "DURABLE_STORAGE_UNAVAILABLE");
    } finally {
      (mongoose.connection as any).readyState = originalReadyState;
    }
  });

  test("6. Development/test in-memory mode still behaves as intentionally configured", async () => {
    (config as any).NODE_ENV = "test";
    process.env.STORAGE_MODE = "memory";

    // In memory mode, /api/ready reports ready: true with storageMode: memory
    const readyRes = await fetch(`${BASE_URL}/api/ready`);
    assert.equal(readyRes.status, 200);
    const readyJson = (await readyRes.json()) as any;
    assert.equal(readyJson.ready, true);
    assert.equal(readyJson.storageMode, "memory");
    assert.equal(readyJson.persisted, false);

    // Reports can be saved in memory mode
    const devReport: AssessmentReport = {
      id: "rep_dev_mem_006",
      opportunityId: "opp_dev_6",
      repositoryUrl: "https://github.com/company/platform",
      resolvedCommitSha: "d".repeat(40),
      status: "completed",
      assessments: [],
      coverageSummary: { total: 0, demonstrated: 0, partiallyDemonstrated: 0, notDemonstrated: 0, needsReview: 0 },
      scannedFilesCount: 5,
      skippedFilesCount: 0,
      createdAt: new Date().toISOString(),
    };

    const createRes = await fetch(`${BASE_URL}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeProvenancedBody(devReport)),
    });
    assert.equal(createRes.status, 201);
    const { viewToken, storageMode, persisted } = (await createRes.json()) as any;
    assert.equal(storageMode, "memory");
    assert.equal(persisted, false);

    // Retrieve from memory
    const getRes = await fetch(`${BASE_URL}/api/reports/rep_dev_mem_006`, {
      headers: { "X-Report-Token": viewToken },
    });
    assert.equal(getRes.status, 200);
    const getJson = (await getRes.json()) as any;
    assert.equal(getJson.persisted, false);
    assert.equal(getJson.storageMode, "memory");
  });

  test("7. Server shutdown and connection failures do not leave unhandled rejections or hanging tests", async () => {
    // Calling disconnect when already disconnected or disconnecting is idempotent
    await assert.doesNotReject(async () => {
      await mongoConnection.disconnect();
      await mongoConnection.disconnect();
    });

    // Connecting to an invalid URI surfaces clean boolean false without uncaught rejection
    const invalidResult = await mongoConnection.connect("not-a-mongo-uri", 0);
    assert.equal(invalidResult, false);

    const emptyResult = await mongoConnection.connect("", 0);
    assert.equal(emptyResult, false);
  });
});
