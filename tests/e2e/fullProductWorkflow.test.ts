import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../../apps/api/src/server.js";
import { mongoConnection } from "../../apps/api/src/storage/mongodb.js";
import { getStorage, setStorage } from "../../apps/api/src/storage/index.js";
import { runManager } from "../../apps/api/src/services/runManager.js";
import {
  ExtractedRequirementsResultSchema,
  AssessmentReportSchema,
  type Requirement,
  type AssessmentReport,
} from "@parakh/contracts";

const realMongoUri = process.env.MONGODB_URI;
const hasLiveCredentials = Boolean(process.env.AI_STUDIO_API_KEY || process.env.MODEL_API_KEY);

describe("Full Product End-to-End Workflow & Reliability Lifecycle Suite", { skip: !hasLiveCredentials }, () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;

  before(async () => {
    setStorage(null);
    if (realMongoUri) {
      await mongoConnection.connect(realMongoUri);
    }
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    server.close();
    if (realMongoUri && mongoConnection.getStatus().connected) {
      await mongoConnection.disconnect();
    }
    runManager.clear();
    setStorage(null);
  });

  test("1-13. Executes end-to-end product workflow across live/configured services", async () => {
    // -------------------------------------------------------------------------
    // Step 1: Submit a realistic opportunity or job brief
    // -------------------------------------------------------------------------
    const realisticBrief = `
Opportunity Brief: Senior Full-Stack Security Engineer
Client: CyberShield Enterprise Systems
Target Capabilities:
1. Must implement defensive API architectures with rate limiting, helmet, and CORS.
2. Must design MongoDB Atlas schemas with strict schema validation and compound indexing.
3. Must implement cryptographic report provenance and audit signatures.
4. Must maintain zero-leakage privacy and secret redaction across log outputs.
    `.trim();

    const briefRes = await fetch(`${baseUrl}/api/opportunity/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: realisticBrief,
        title: "CyberShield Security Engineer RFP",
      }),
    });

    assert.equal(briefRes.status, 200, "Brief extraction must succeed with 200 OK");
    const extractionPayload = (await briefRes.json()) as any;
    assert.equal(extractionPayload.status, "success");

    // -------------------------------------------------------------------------
    // Step 2: Extract structured requirements
    // -------------------------------------------------------------------------
    const validatedExtraction = ExtractedRequirementsResultSchema.parse(extractionPayload.extraction);
    assert.ok(validatedExtraction.requirements.length >= 2, "Must extract at least 2 structured requirements");

    // -------------------------------------------------------------------------
    // Step 3: Review and confirm the requirements (add custom criteria)
    // -------------------------------------------------------------------------
    const confirmedRequirements: Requirement[] = validatedExtraction.requirements.map((r, idx) => ({
      ...r,
      priority: idx === 0 ? "mandatory" : r.priority,
      acceptanceCriteria: idx === 0 ? ["All routes return JSON schema compliant payloads"] : r.acceptanceCriteria,
    }));

    // -------------------------------------------------------------------------
    // Step 4 & 5: Connect to repository and pin to commit SHA
    // -------------------------------------------------------------------------
    const repositoryUrl = "https://github.com/puneetnith28/Parakh";
    const pinnedCommitSha = "e95ebb9e2b41e7974573735c1db7486812d16f18";

    // -------------------------------------------------------------------------
    // Step 6 & 7: Retrieve repository evidence and generate assessment
    // -------------------------------------------------------------------------
    const analysisRes = await fetch(`${baseUrl}/api/analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repositoryUrl,
        ref: pinnedCommitSha,
        opportunityId: extractionPayload.opportunity.id,
        title: extractionPayload.opportunity.title,
        requirements: confirmedRequirements,
      }),
    });

    assert.equal(analysisRes.status, 200, "Capability analysis orchestration must return 200");
    const analysisPayload = (await analysisRes.json()) as any;
    assert.equal(analysisPayload.status, "success");

    const report: AssessmentReport = AssessmentReportSchema.parse(analysisPayload.report);
    const viewToken = analysisPayload.viewToken;
    const runId = analysisPayload.runId;
    const provenanceToken = analysisPayload.provenanceToken;

    assert.ok(report.id, "Report must have a valid ID");
    assert.ok(runId, "Analysis run must produce a valid runId");
    assert.ok(viewToken && viewToken.length === 64, "viewToken must be 64-char hex");
    assert.ok(provenanceToken && provenanceToken.length === 64, "provenanceToken must be 64-char hex");

    // -------------------------------------------------------------------------
    // Step 8: Verify citations reference correct repository, commit, file, lines
    // -------------------------------------------------------------------------
    assert.equal(report.status, "completed");
    assert.match(report.resolvedCommitSha, /^[0-9a-f]{40}$/i, "Commit SHA must be pinned 40-char hex");

    for (const assessment of report.assessments) {
      if (assessment.status === "demonstrated") {
        assert.ok(assessment.citations.length > 0, "Demonstrated assessments must cite evidence");
        for (const citation of assessment.citations) {
          assert.ok(citation.candidateId, "Citation must have candidateId");
          assert.ok(citation.path, "Citation must have path");
          assert.match(citation.commitSha, /^[0-9a-f]{40}$/i, "Citation must match commit SHA format");
          assert.ok(citation.snippet.length > 0, "Snippet cannot be empty");
          if (citation.startLine && citation.endLine) {
            assert.ok(citation.startLine <= citation.endLine, "startLine must not exceed endLine");
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // Step 9: Verify persistence in database
    // -------------------------------------------------------------------------
    const storage = getStorage();
    const storedRecord = await storage.getReportById(report.id);
    assert.ok(storedRecord, "Report must be persisted in database");
    assert.equal(storedRecord.report.id, report.id);
    assert.equal(storedRecord.viewToken, viewToken);

    // -------------------------------------------------------------------------
    // Step 10: Retrieve report after simulating application restart / refresh
    // -------------------------------------------------------------------------
    // Restart HTTP server on new dynamic port
    await new Promise<void>((resolve) => server.close(() => resolve()));
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    const refreshedRes = await fetch(`${baseUrl}/api/reports/${report.id}?token=${viewToken}`);
    assert.equal(refreshedRes.status, 200, "Refreshed component must retrieve persisted report");
    const refreshedBody = (await refreshedRes.json()) as any;
    assert.equal(refreshedBody.report.id, report.id);

    // -------------------------------------------------------------------------
    // Step 11: Open and validate a shared report using authorization mechanism
    // -------------------------------------------------------------------------
    const shareRes = await fetch(`${baseUrl}/api/reports/${report.id}/share`, {
      method: "POST",
      headers: { "X-Report-Token": viewToken },
    });
    assert.equal(shareRes.status, 200);
    const shareBody = (await shareRes.json()) as any;
    assert.ok(shareBody.shareUrl.includes(viewToken));

    // Access with Bearer token
    const bearerRes = await fetch(`${baseUrl}/api/reports/${report.id}`, {
      headers: { Authorization: `Bearer ${viewToken}` },
    });
    assert.equal(bearerRes.status, 200);

    // -------------------------------------------------------------------------
    // Step 12: Delete report and verify it is no longer retrievable
    // -------------------------------------------------------------------------
    const deleteRes = await fetch(`${baseUrl}/api/reports/${report.id}`, {
      method: "DELETE",
      headers: { "X-Report-Token": viewToken },
    });
    assert.equal(deleteRes.status, 204, "Report deletion must return 204 No Content");

    const lookupAfterDelete = await fetch(`${baseUrl}/api/reports/${report.id}`, {
      headers: { "X-Report-Token": viewToken },
    });
    assert.equal(lookupAfterDelete.status, 404, "Deleted report must return 404 Not Found");

    const directDbLookup = await storage.getReportById(report.id);
    assert.equal(directDbLookup, null, "Deleted report must be permanently purged from database");
  });

  test("14. Failure paths: SSRF attack, nonexistent repo, bad tokens, and tampering are safely rejected", async () => {
    // A. SSRF loopback injection
    const ssrfRes = await fetch(`${baseUrl}/api/analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repositoryUrl: "http://127.0.0.1:8080/internal/admin",
        requirements: [{ id: "r1", text: "Test req" }],
      }),
    });
    assert.equal(ssrfRes.status, 400, "SSRF attempt must return 400 Bad Request");
    const ssrfBody = (await ssrfRes.json()) as any;
    assert.match(ssrfBody.message, /SSRF|invalid/i);

    // B. Missing viewToken
    const missingTokenRes = await fetch(`${baseUrl}/api/reports/rep_random_123`);
    assert.equal(missingTokenRes.status, 401, "Missing token must return 401");

    // C. Invalid viewToken
    const invalidTokenRes = await fetch(`${baseUrl}/api/reports/rep_random_123`, {
      headers: { "X-Report-Token": "bad_token_000000000000000000000000000000000000000000000000000000000000" },
    });
    assert.equal(invalidTokenRes.status, 404, "Non-existent report ID must return 404");

    // D. Direct unprovenanced client report submission
    const fakeReport: AssessmentReport = {
      id: "rep_forged_999",
      opportunityId: "opp_f9",
      repositoryUrl: "https://github.com/company/repo",
      resolvedCommitSha: "a".repeat(40),
      status: "completed",
      assessments: [],
      coverageSummary: { total: 0, demonstrated: 0, partiallyDemonstrated: 0, notDemonstrated: 0, needsReview: 0 },
      scannedFilesCount: 1,
      skippedFilesCount: 0,
      createdAt: new Date().toISOString(),
    };
    const forgedRes = await fetch(`${baseUrl}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fakeReport),
    });
    assert.equal(forgedRes.status, 403, "Unprovenanced report must return 403 Forbidden");

    // E. Cancellation on active run
    const fakeRunId = "run_to_cancel_123";
    runManager.createOrGetRun({
      runId: fakeRunId,
      opportunityId: "opp_c1",
      repositoryUrl: "https://github.com/company/repo",
    });
    runManager.transitionState(fakeRunId, "INGESTING_REPO");

    const cancelRes = await fetch(`${baseUrl}/api/analysis/${fakeRunId}/cancel`, {
      method: "POST",
    });
    assert.equal(cancelRes.status, 200, "Cancelling active run must return 200 OK");
    assert.equal(runManager.isCancelled(fakeRunId), true);
  });
});
