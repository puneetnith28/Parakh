import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { AssessmentReport } from "@parakh/contracts";
import { getStorage, setStorage, MemoryReportStorage } from "./index.js";
import { MongoReportStorage } from "./mongoStore.js";
import { AssessmentReportModel } from "./models/Report.js";
import {
  computeReportContentHash,
  issueProvenanceToken,
  verifyReportProvenance,
} from "../services/provenance.js";
import { runManager } from "../services/runManager.js";

test("MemoryReportStorage operates 100% statelessly without MONGODB_URI", async () => {
  setStorage(new MemoryReportStorage());
  const storage = getStorage();

  assert.equal(storage.getMode(), "memory");
  assert.equal(storage.isPersistent(), false);

  const sampleReport: AssessmentReport = {
    id: "rep_mem_001",
    opportunityId: "opp_mem_001",
    repositoryUrl: "https://github.com/sample/repo",
    resolvedCommitSha: "1".repeat(40),
    status: "completed",
    assessments: [],
    coverageSummary: {
      total: 0,
      demonstrated: 0,
      partiallyDemonstrated: 0,
      notDemonstrated: 0,
      needsReview: 0,
    },
    scannedFilesCount: 10,
    skippedFilesCount: 2,
    createdAt: new Date().toISOString(),
  };

  const viewToken = "sec_token_abc123";

  // 1. Save report
  await storage.saveReport(sampleReport, viewToken);

  // 2. Fetch by valid token
  const retrieved = await storage.getReportByToken("rep_mem_001", viewToken);
  assert.ok(retrieved);
  assert.equal(retrieved?.id, "rep_mem_001");

  // 3. Reject invalid token
  const rejected = await storage.getReportByToken("rep_mem_001", "wrong_token");
  assert.equal(rejected, null);

  // 4. Delete report with valid token
  const deleted = await storage.deleteReport("rep_mem_001", viewToken);
  assert.equal(deleted, true);

  // 5. Verify deleted
  const afterDelete = await storage.getReportById("rep_mem_001");
  assert.equal(afterDelete, null);
});

test("MongoReportStorage preserves provenance fields (opportunityTitle, repoMetadata) across persistence", async () => {
  const storage = new MongoReportStorage();
  const documentStore = new Map<string, any>();

  // Mock AssessmentReportModel operations using real Mongoose Documents for full schema validation
  const findOneAndUpdateMock = mock.method(
    AssessmentReportModel,
    "findOneAndUpdate",
    async (filter: any, update: any) => {
      const doc = new AssessmentReportModel(update);
      const validationErr = doc.validateSync();
      if (validationErr) throw validationErr;
      documentStore.set(filter.reportId, doc);
      return doc;
    }
  );

  const findOneMock = mock.method(
    AssessmentReportModel,
    "findOne",
    async (query: any) => {
      const doc = documentStore.get(query.reportId);
      if (!doc) return null;
      if (query.viewToken && doc.viewToken !== query.viewToken) return null;
      return doc;
    }
  );

  const deleteOneMock = mock.method(
    AssessmentReportModel,
    "deleteOne",
    async (query: any) => {
      const doc = documentStore.get(query.reportId);
      if (!doc || doc.viewToken !== query.viewToken) {
        return { deletedCount: 0 };
      }
      documentStore.delete(query.reportId);
      return { deletedCount: 1 };
    }
  );

  const reportId = "rep_provenance_full_001";
  const runId = "run_provenance_full_001";
  const viewToken = "sec_view_token_full_999";

  const representativeReport: AssessmentReport = {
    id: reportId,
    opportunityId: "opp_sr_backend_001",
    opportunityTitle: "Staff Platform & Distributed Systems Engineer",
    repositoryUrl: "https://github.com/acme/distributed-runtime",
    resolvedCommitSha: "d1d2d3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9d0",
    repoMetadata: {
      owner: "acme",
      repo: "distributed-runtime",
      defaultBranch: "main",
    },
    status: "completed",
    assessments: [
      {
        requirementId: "req_dist_01",
        requirementText: "Demonstrates distributed consensus understanding",
        status: "demonstrated",
        rationale: "Implements Raft consensus log compaction",
        confidence: "high",
        citedCandidateIds: ["cand_raft_1"],
        citations: [
          {
            candidateId: "cand_raft_1",
            repository: "acme/distributed-runtime",
            commitSha: "d1d2d3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9d0",
            path: "src/raft/log.ts",
            canonicalUrl: "https://github.com/acme/distributed-runtime/blob/d1d2d3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9d0/src/raft/log.ts#L10-L40",
            startLine: 10,
            endLine: 40,
            evidenceType: "source_code",
            snippet: "export class RaftLog { compact() { ... } }",
          },
        ],
        nextActions: ["Add cluster chaos tests"],
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
    skippedFilesCount: 2,
    limitations: ["Simulated network partitions only"],
    gapRecommendations: ["Evaluate under Jepsen test suite"],
    createdAt: new Date().toISOString(),
  };

  try {
    // 1. Authoritative canonical hash before storage
    const authoritativeHash = computeReportContentHash(representativeReport);

    // 2. Register run and issue provenance token
    runManager.createOrGetRun({
      runId,
      opportunityId: representativeReport.opportunityId,
      repositoryUrl: representativeReport.repositoryUrl,
    });
    runManager.transitionState(runId, "COMPLETED", {
      reportId,
      reportContentHash: authoritativeHash,
    });
    const provenanceToken = issueProvenanceToken({
      runId,
      reportId,
      opportunityId: representativeReport.opportunityId,
      repositoryUrl: representativeReport.repositoryUrl,
      resolvedCommitSha: representativeReport.resolvedCommitSha,
      contentHash: authoritativeHash,
    });

    // 3. Persist through real MongoReportStorage adapter
    await storage.saveReport(representativeReport, viewToken);

    // 4. Retrieve by ID
    const retrievedById = await storage.getReportById(reportId);
    assert.ok(retrievedById, "Report must be retrievable by ID");
    assert.equal(retrievedById.viewToken, viewToken);

    // 5. Verify fields survive deserialization with exact values
    assert.equal(retrievedById.report.opportunityTitle, "Staff Platform & Distributed Systems Engineer");
    assert.deepEqual(retrievedById.report.repoMetadata, {
      owner: "acme",
      repo: "distributed-runtime",
      defaultBranch: "main",
    });

    // 6. Verify canonical content hash matches exactly after database round-trip
    const retrievedHash = computeReportContentHash(retrievedById.report);
    assert.equal(
      retrievedHash,
      authoritativeHash,
      "Content hash must remain identical across serialization and deserialization"
    );

    // 7. Verify cryptographic provenance validation succeeds
    const verification = verifyReportProvenance(retrievedById.report, runId, provenanceToken);
    assert.equal(verification.verified, true, "Provenance must verify successfully on retrieved report");

    // 8. Verify tampering with opportunityTitle fails verification
    const tamperedTitleReport = {
      ...retrievedById.report,
      opportunityTitle: "Junior Frontend Intern",
    };
    const tamperedTitleHash = computeReportContentHash(tamperedTitleReport);
    assert.notEqual(tamperedTitleHash, authoritativeHash);
    const tamperedTitleVerification = verifyReportProvenance(tamperedTitleReport, runId, provenanceToken);
    assert.equal(tamperedTitleVerification.verified, false);

    // 9. Verify tampering with repoMetadata fails verification
    const tamperedRepoReport = {
      ...retrievedById.report,
      repoMetadata: {
        owner: "attacker",
        repo: "malicious-repo",
        defaultBranch: "main",
      },
    };
    const tamperedRepoHash = computeReportContentHash(tamperedRepoReport);
    assert.notEqual(tamperedRepoHash, authoritativeHash);
    const tamperedRepoVerification = verifyReportProvenance(tamperedRepoReport, runId, provenanceToken);
    assert.equal(tamperedRepoVerification.verified, false);

    // 10. Verify backward compatibility: older MongoDB documents missing optional fields
    const legacyReportId = "rep_legacy_roundtrip_001";
    const legacyDoc = new AssessmentReportModel({
      reportId: legacyReportId,
      opportunityId: "opp_legacy",
      // opportunityTitle omitted
      repositoryUrl: "https://github.com/acme/legacy",
      resolvedCommitSha: "e".repeat(40),
      // repoMetadata omitted
      status: "completed",
      schemaVersion: 1,
      viewToken: "token_legacy_123",
      assessments: [],
      coverageSummary: {
        total: 0,
        demonstrated: 0,
        partiallyDemonstrated: 0,
        notDemonstrated: 0,
        needsReview: 0,
      },
    });
    documentStore.set(legacyReportId, legacyDoc);

    const retrievedLegacy = await storage.getReportById(legacyReportId);
    assert.ok(retrievedLegacy);
    assert.equal(retrievedLegacy.report.opportunityTitle, undefined);
    assert.equal(retrievedLegacy.report.repoMetadata, undefined);

    // Hash computation matches legacy expectations (missing fields map to null)
    const legacyHash = computeReportContentHash(retrievedLegacy.report);
    assert.ok(typeof legacyHash === "string" && legacyHash.length === 64);
  } finally {
    findOneAndUpdateMock.mock.restore();
    findOneMock.mock.restore();
    deleteOneMock.mock.restore();
    runManager.clear();
  }
});

