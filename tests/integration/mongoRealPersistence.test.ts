import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { mongoConnection } from "../../apps/api/src/storage/mongodb.js";
import { getStorage, setStorage } from "../../apps/api/src/storage/index.js";
import { ensureDatabaseIndexes } from "../../apps/api/src/storage/models/indexes.js";
import { AssessmentReport } from "@parakh/contracts";
import crypto from "node:crypto";

const realMongoUri = process.env.MONGODB_URI;

describe("Real MongoDB Atlas Integration and Durable Persistence Suite", { skip: !realMongoUri }, () => {
  const testReportId = `rep_real_atlas_${Date.now()}`;
  const testViewToken = crypto.randomBytes(32).toString("hex");

  before(async () => {
    // Reset any custom storage so live MongoReportStorage is dynamically resolved
    setStorage(null);

    const connected = await mongoConnection.connect(realMongoUri);
    assert.equal(connected, true, "Must connect to real MongoDB Atlas");

    await ensureDatabaseIndexes();
  });

  after(async () => {
    // Clean up test document if any remained
    if (mongoose.connection.readyState === 1) {
      const storage = getStorage();
      await storage.deleteReport(testReportId, testViewToken).catch(() => {});
    }
    await mongoConnection.disconnect();
    setStorage(null);
  });

  test("1. Successfully connects to real MongoDB Atlas and verifies TLS security", async () => {
    const status = mongoConnection.getStatus();
    assert.equal(status.connected, true);
    assert.equal(status.state, "connected");
    assert.ok(status.host, "Atlas host must be populated");
    assert.equal(status.name, "parakh");

    const security = await mongoConnection.verifyProductionSecurity();
    assert.equal(security.secure, true);
    assert.equal(security.tlsEnforced, true);
    assert.ok(security.pingMs >= 0, "Ping latency must be measured");
  });

  test("2. getStorage() dynamically returns durable MongoReportStorage without overrides", () => {
    const storage = getStorage();
    assert.equal(storage.getMode(), "mongodb");
    assert.equal(storage.isPersistent(), true);
  });

  test("3. Saves and retrieves verified assessment report to real Atlas database", async () => {
    const storage = getStorage();

    const sampleReport: AssessmentReport = {
      id: testReportId,
      opportunityId: "opp_live_atlas_01",
      repositoryUrl: "https://github.com/puneetnith28/Parakh",
      resolvedCommitSha: "e95ebb9e2b41e7974573735c1db7486812d16f18",
      status: "completed",
      assessments: [
        {
          requirementId: "req_live_01",
          requirementText: "MongoDB persistence layer must be durable and verifiable",
          status: "demonstrated",
          rationale: "Live integration test confirmed write and read operations against MongoDB Atlas",
          citedCandidateIds: ["cand_01"],
          citations: [
            {
              candidateId: "cand_01",
              repository: "puneetnith28/Parakh",
              commitSha: "e95ebb9e2b41e7974573735c1db7486812d16f18",
              path: "apps/api/src/storage/mongoStore.ts",
              canonicalUrl: "https://github.com/puneetnith28/Parakh/blob/main/apps/api/src/storage/mongoStore.ts",
              evidenceType: "source_code",
              snippet: "export class MongoReportStorage implements ReportStorage",
            },
          ],
          nextActions: [],
          confidence: "high",
          manuallyOverridden: false,
        },
      ],
      coverageSummary: {
        total: 1,
        demonstrated: 1,
        partiallyDemonstrated: 0,
        notDemonstrated: 0,
        needsReview: 0,
      },
      scannedFilesCount: 42,
      skippedFilesCount: 3,
      createdAt: new Date().toISOString(),
    };

    // Save report to Atlas
    const saved = await storage.saveReport(sampleReport, testViewToken, 7);
    assert.equal(saved.id, testReportId);

    // Retrieve by ID
    const retrievedById = await storage.getReportById(testReportId);
    assert.ok(retrievedById);
    assert.equal(retrievedById?.report.id, testReportId);
    assert.equal(retrievedById?.report.opportunityId, "opp_live_atlas_01");
    assert.equal(retrievedById?.report.assessments.length, 1);
    assert.equal(retrievedById?.viewToken, testViewToken);

    // Retrieve by Token
    const retrievedByToken = await storage.getReportByToken(testReportId, testViewToken);
    assert.ok(retrievedByToken);
    assert.equal(retrievedByToken?.id, testReportId);
    assert.equal(retrievedByToken?.coverageSummary.demonstrated, 1);

    // Reject wrong token
    const wrongTokenResult = await storage.getReportByToken(testReportId, "invalid_view_token");
    assert.equal(wrongTokenResult, null);
  });

  test("4. Permanently deletes report and verifies non-existence in real Atlas", async () => {
    const storage = getStorage();

    const deleted = await storage.deleteReport(testReportId, testViewToken);
    assert.equal(deleted, true, "Delete report should succeed");

    // Post-deletion lookup must return null
    const afterDelete = await storage.getReportById(testReportId);
    assert.equal(afterDelete, null, "Report should no longer exist after deletion");
  });
});
