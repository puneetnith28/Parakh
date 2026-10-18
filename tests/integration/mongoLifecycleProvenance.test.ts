import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";
import app from "../../apps/api/src/server.js";
import { mongoConnection } from "../../apps/api/src/storage/mongodb.js";
import { getStorage, setStorage } from "../../apps/api/src/storage/index.js";
import { AssessmentReportModel } from "../../apps/api/src/storage/models/Report.js";
import {
  computeReportContentHash,
  issueProvenanceToken,
  verifyReportProvenance,
} from "../../apps/api/src/services/provenance.js";
import { runManager } from "../../apps/api/src/services/runManager.js";
import { reportService } from "../../apps/api/src/storage/services/reportService.js";
import { AssessmentReport } from "@parakh/contracts";

// Only connect to live Atlas if TEST_LIVE_MONGODB is explicitly set; otherwise default to stateless memory
const realMongoUri = process.env.TEST_LIVE_MONGODB === "true" ? process.env.MONGODB_URI : undefined;

describe("MongoDB Lifecycle, Provenance Preservation, and Tamper Detection Suite", () => {
  let server: http.Server;
  const PORT = 3096;
  const BASE_URL = `http://localhost:${PORT}`;

  const reportId = `rep_lifecycle_${Date.now()}`;
  const runId = `run_lifecycle_${Date.now()}`;
  const opportunityId = "opp_lifecycle_001";
  const repositoryUrl = "https://github.com/acme/platform";
  const resolvedCommitSha = "e95ebb9e2b41e7974573735c1db7486812d16f18";
  const viewToken = crypto.randomBytes(32).toString("hex");

  const originalReport: AssessmentReport = {
    id: reportId,
    opportunityId,
    opportunityTitle: "Staff Platform & Distributed Systems Engineer",
    repositoryUrl,
    resolvedCommitSha,
    repoMetadata: {
      owner: "acme",
      repo: "platform",
      defaultBranch: "main",
    },
    status: "completed",
    assessments: [
      {
        requirementId: "req_db_01",
        requirementText: "MongoDB persistence preserves cryptographic integrity",
        status: "demonstrated",
        rationale: "Deserialized records match canonical content hash exactly",
        confidence: "high",
        citedCandidateIds: ["cand_db_1"],
        citations: [
          {
            candidateId: "cand_db_1",
            repository: "acme/platform",
            commitSha: resolvedCommitSha,
            path: "apps/api/src/storage/mongoStore.ts",
            canonicalUrl: `https://github.com/acme/platform/blob/${resolvedCommitSha}/apps/api/src/storage/mongoStore.ts#L17-L45`,
            startLine: 17,
            endLine: 45,
            evidenceType: "source_code",
            snippet: "async saveReport(report: AssessmentReport, viewToken: string)",
          },
        ],
        nextActions: [],
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
    scannedFilesCount: 20,
    skippedFilesCount: 1,
    limitations: ["Tested against local or mock test storage"],
    gapRecommendations: ["Verify automated index maintenance"],
    createdAt: new Date().toISOString(),
  };

  before(async () => {
    setStorage(null);
    if (realMongoUri) {
      await mongoConnection.connect(realMongoUri);
    }
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(PORT, resolve));
  });

  after(async () => {
    server.close();
    if (realMongoUri && mongoConnection.getStatus().connected) {
      const storage = getStorage();
      await storage.deleteReport(reportId, viewToken).catch(() => {});
      await mongoConnection.disconnect();
    }
    runManager.clear();
    setStorage(null);
  });

  test("1. Verified report remains verifiable after being persisted and retrieved from database", async () => {
    // 1. Calculate authoritative hash and issue server token
    const initialHash = computeReportContentHash(originalReport);
    runManager.createOrGetRun({
      runId,
      opportunityId,
      repositoryUrl,
    });
    runManager.transitionState(runId, "COMPLETED", {
      reportId,
      reportContentHash: initialHash,
    });
    const provenanceToken = issueProvenanceToken({
      runId,
      reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      contentHash: initialHash,
    });

    // Verify in-memory before persistence
    const preSaveVerification = verifyReportProvenance(originalReport, runId, provenanceToken);
    assert.equal(preSaveVerification.verified, true);

    // 2. Persist to storage (MongoDB Atlas if connected, or memory)
    const storage = getStorage();
    await storage.saveReport(originalReport, viewToken);

    // 3. Retrieve from database
    const retrievedRecord = await storage.getReportById(reportId);
    assert.ok(retrievedRecord, "Report record must be retrievable from database");
    assert.equal(retrievedRecord?.viewToken, viewToken);

    // 4. Canonical integrity hash after retrieval
    const retrievedHash = computeReportContentHash(retrievedRecord!.report);
    assert.equal(
      retrievedHash,
      initialHash,
      "Report serialization and deserialization must not alter the canonical integrity hash"
    );

    // 5. Provenance verification on retrieved report
    const postRetrievalVerification = verifyReportProvenance(retrievedRecord!.report, runId, provenanceToken);
    assert.equal(
      postRetrievalVerification.verified,
      true,
      "Retrieved database report must verify successfully with original server provenance token"
    );
  });

  test("2. Directly tampered database content is detected and fails provenance verification", async () => {
    const storage = getStorage();
    const initialHash = computeReportContentHash(originalReport);
    const provenanceToken = issueProvenanceToken({
      runId,
      reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      contentHash: initialHash,
    });

    // Simulate an attacker directly modifying the database document (bypassing API)
    if (storage.getMode() === "mongodb") {
      await AssessmentReportModel.findOneAndUpdate(
        { reportId },
        { $set: { "assessments.0.status": "not_demonstrated" } }
      );
    } else {
      // In-memory simulation: mutate raw stored report record directly in memory map
      const rawStoredRecord = (storage as any).reports?.get(reportId);
      if (rawStoredRecord) {
        rawStoredRecord.report.assessments[0].status = "not_demonstrated";
      }
    }

    // Retrieve the tampered record
    const tamperedRecord = await storage.getReportById(reportId);
    assert.ok(tamperedRecord);

    const tamperedHash = computeReportContentHash(tamperedRecord!.report);
    assert.notEqual(tamperedHash, initialHash, "Tampered report must produce a different content hash");

    const verification = verifyReportProvenance(tamperedRecord!.report, runId, provenanceToken);
    assert.equal(verification.verified, false, "Tampered database content must fail provenance verification");
    assert.match(verification.reason!, /material content altered|signature mismatch/i);
  });

  test("3. Share tokens and report tokens are isolated (Token A cannot access Report B)", async () => {
    const storage = getStorage();
    const otherReportId = `rep_other_${Date.now()}`;
    const otherToken = crypto.randomBytes(32).toString("hex");

    const otherReport: AssessmentReport = {
      ...originalReport,
      id: otherReportId,
    };

    await storage.saveReport(otherReport, otherToken);

    try {
      // Attempting to retrieve other report using primary viewToken
      const wrongTokenRetrieval = await storage.getReportByToken(otherReportId, viewToken);
      assert.equal(wrongTokenRetrieval, null, "Primary token must not authorize access to secondary report");

      // HTTP endpoint enforcement
      const res = await fetch(`${BASE_URL}/api/reports/${otherReportId}`, {
        headers: { "X-Report-Token": viewToken },
      });
      assert.equal(res.status, 403, "Cross-report token usage must be rejected with 403 Forbidden");
    } finally {
      await storage.deleteReport(otherReportId, otherToken).catch(() => {});
    }
  });

  test("4. Deleted reports cannot be retrieved through storage or API endpoints", async () => {
    const storage = getStorage();

    // Cascade delete report
    const deleted = await reportService.cascadeDeleteReport(reportId, viewToken);
    assert.equal(deleted, true, "Report deletion must return true");

    // Subsequent direct storage lookup must return null
    const lookupAfterDelete = await storage.getReportById(reportId);
    assert.equal(lookupAfterDelete, null, "Deleted report must not exist in storage");

    // Subsequent API lookup must return 404 Not Found
    const apiLookup = await fetch(`${BASE_URL}/api/reports/${reportId}`, {
      headers: { "X-Report-Token": viewToken },
    });
    assert.equal(apiLookup.status, 404, "Deleted report must return 404 on API endpoints");
  });

  test("5. Provenance verification fails if opportunityTitle or repoMetadata is altered", () => {
    const canonicalHash = computeReportContentHash(originalReport);
    const token = issueProvenanceToken({
      runId,
      reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      contentHash: canonicalHash,
    });

    // 1. Tamper opportunityTitle
    const tamperedTitle = {
      ...originalReport,
      opportunityTitle: "Completely Fabricated Title",
    };
    const titleHash = computeReportContentHash(tamperedTitle);
    assert.notEqual(titleHash, canonicalHash);
    const titleVerification = verifyReportProvenance(tamperedTitle, runId, token);
    assert.equal(titleVerification.verified, false);

    // 2. Tamper repoMetadata
    const tamperedRepo = {
      ...originalReport,
      repoMetadata: {
        owner: "evil-org",
        repo: "trojan-platform",
        defaultBranch: "exploit",
      },
    };
    const repoHash = computeReportContentHash(tamperedRepo);
    assert.notEqual(repoHash, canonicalHash);
    const repoVerification = verifyReportProvenance(tamperedRepo, runId, token);
    assert.equal(repoVerification.verified, false);
  });

  test("6. Backward compatibility: older documents missing optional fields produce stable canonical hash", () => {
    const legacyReport: AssessmentReport = {
      id: "rep_legacy_compat_001",
      opportunityId: "opp_legacy_compat",
      // opportunityTitle omitted
      repositoryUrl: "https://github.com/acme/legacy-compat",
      resolvedCommitSha: "f".repeat(40),
      // repoMetadata omitted
      status: "completed",
      assessments: [],
      coverageSummary: {
        total: 0,
        demonstrated: 0,
        partiallyDemonstrated: 0,
        notDemonstrated: 0,
        needsReview: 0,
      },
      scannedFilesCount: 5,
      skippedFilesCount: 0,
      createdAt: new Date().toISOString(),
    };

    const legacyHash = computeReportContentHash(legacyReport);
    assert.ok(typeof legacyHash === "string" && legacyHash.length === 64);

    runManager.createOrGetRun({
      runId: "run_legacy_001",
      opportunityId: legacyReport.opportunityId,
      repositoryUrl: legacyReport.repositoryUrl,
    });
    runManager.transitionState("run_legacy_001", "COMPLETED", {
      reportId: legacyReport.id,
      reportContentHash: legacyHash,
    });

    const legacyToken = issueProvenanceToken({
      runId: "run_legacy_001",
      reportId: legacyReport.id,
      opportunityId: legacyReport.opportunityId,
      repositoryUrl: legacyReport.repositoryUrl,
      resolvedCommitSha: legacyReport.resolvedCommitSha,
      contentHash: legacyHash,
    });

    const verification = verifyReportProvenance(legacyReport, "run_legacy_001", legacyToken);
    assert.equal(verification.verified, true);
  });
});

