import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../../apps/api/src/server.js";
import { AssessmentReport } from "@parakh/contracts";
import { setStorage, MemoryReportStorage } from "../../apps/api/src/storage/index.js";
import { runManager } from "../../apps/api/src/services/runManager.js";
import { issueProvenanceToken } from "../../apps/api/src/services/provenance.js";
import { ensureDatabaseIndexes } from "../../apps/api/src/storage/models/indexes.js";

function makeProvenancedBody(report: AssessmentReport, runId = `run_${report.id}`) {
  runManager.createOrGetRun({
    runId,
    opportunityId: report.opportunityId,
    repositoryUrl: report.repositoryUrl,
  });
  const provenanceToken = issueProvenanceToken({
    runId,
    reportId: report.id,
    opportunityId: report.opportunityId,
    repositoryUrl: report.repositoryUrl,
    resolvedCommitSha: report.resolvedCommitSha,
  });
  return { report, runId, provenanceToken };
}

describe("Data Lifecycle, Authorization, and Persistence Test Suite", () => {
  let server: http.Server;
  const PORT = 3098;
  const BASE_URL = `http://localhost:${PORT}`;

  before(async () => {
    setStorage(new MemoryReportStorage());
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(PORT, resolve));
    await ensureDatabaseIndexes();
  });

  after(() => {
    server.close();
    runManager.clear();
  });

  test("0. Direct unprovenanced client report submission is strictly rejected (403 Forbidden)", async () => {
    const rawReport: AssessmentReport = {
      id: "rep_unprovenanced_001",
      opportunityId: "opp_enterprise_1",
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
      body: JSON.stringify(rawReport),
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as any;
    assert.equal(body.code, "UNTRUSTED_REPORT_PROVENANCE");
  });

  test("1. Report creation enqueues sanitized data and issues 256-bit viewToken", async () => {
    const reportPayload: AssessmentReport = {
      id: "rep_e2e_001",
      opportunityId: "opp_enterprise_1",
      repositoryUrl: "https://github.com/company/platform",
      resolvedCommitSha: "d34db33f".repeat(5),
      status: "completed",
      assessments: [
        {
          requirementId: "req_001",
          requirementText: "Must use Node.js microservices",
          status: "demonstrated",
          rationale: "Found Express services in apps/api",
          citedCandidateIds: ["cand_01"],
          citations: [
            {
              candidateId: "cand_01",
              repository: "company/platform",
              commitSha: "d34db33f".repeat(5),
              path: "apps/api/src/server.ts",
              canonicalUrl: "https://github.com/company/platform/blob/main/apps/api/src/server.ts",
              evidenceType: "source_code",
              snippet: "import express from 'express';",
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
      scannedFilesCount: 25,
      skippedFilesCount: 5,
      createdAt: new Date().toISOString(),
    };

    const res = await fetch(`${BASE_URL}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeProvenancedBody(reportPayload)),
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as any;
    assert.equal(body.status, "success");
    assert.equal(body.reportId, "rep_e2e_001");
    assert.ok(body.viewToken);
    assert.equal(body.viewToken.length, 64);
  });

  test("2. Tenant isolation: Token for Report A cannot access Report B", async () => {
    const reportA: AssessmentReport = {
      id: "rep_tenant_A",
      opportunityId: "opp_A",
      repositoryUrl: "https://github.com/tenant-a/repo",
      resolvedCommitSha: "1".repeat(40),
      status: "completed",
      assessments: [],
      coverageSummary: { total: 0, demonstrated: 0, partiallyDemonstrated: 0, notDemonstrated: 0, needsReview: 0 },
      scannedFilesCount: 1,
      skippedFilesCount: 0,
      createdAt: new Date().toISOString(),
    };

    const reportB: AssessmentReport = {
      id: "rep_tenant_B",
      opportunityId: "opp_B",
      repositoryUrl: "https://github.com/tenant-b/repo",
      resolvedCommitSha: "2".repeat(40),
      status: "completed",
      assessments: [],
      coverageSummary: { total: 0, demonstrated: 0, partiallyDemonstrated: 0, notDemonstrated: 0, needsReview: 0 },
      scannedFilesCount: 1,
      skippedFilesCount: 0,
      createdAt: new Date().toISOString(),
    };

    // Create Report A
    const resA = await fetch(`${BASE_URL}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeProvenancedBody(reportA)),
    });
    const { viewToken: tokenA } = (await resA.json()) as any;

    // Create Report B
    const resB = await fetch(`${BASE_URL}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeProvenancedBody(reportB)),
    });
    const { viewToken: tokenB } = (await resB.json()) as any;

    // Token A reading Report A -> 200 OK
    const readA = await fetch(`${BASE_URL}/api/reports/rep_tenant_A`, {
      headers: { "X-Report-Token": tokenA },
    });
    assert.equal(readA.status, 200);

    // Token A reading Report B -> 403 Forbidden
    const crossRead = await fetch(`${BASE_URL}/api/reports/rep_tenant_B`, {
      headers: { "X-Report-Token": tokenA },
    });
    assert.equal(crossRead.status, 403);
    const crossBody = (await crossRead.json()) as any;
    assert.equal(crossBody.code, "FORBIDDEN");

    // Token B reading Report B -> 200 OK
    const readB = await fetch(`${BASE_URL}/api/reports/rep_tenant_B`, {
      headers: { "X-Report-Token": tokenB },
    });
    assert.equal(readB.status, 200);
  });

  test("3. Idempotency guard deduplicates duplicate analysis execution triggers", () => {
    const key = "e2e-idempotency-key-777";
    const res1 = runManager.createOrGetRun({
      runId: "run_e2e_1",
      opportunityId: "opp_1",
      repositoryUrl: "https://github.com/owner/repo",
      idempotencyKey: key,
    });
    assert.equal(res1.isNew, true);
    assert.equal(res1.run.runId, "run_e2e_1");

    // Second call returns original run
    const res2 = runManager.createOrGetRun({
      runId: "run_e2e_2_duplicate",
      opportunityId: "opp_1",
      repositoryUrl: "https://github.com/owner/repo",
      idempotencyKey: key,
    });
    assert.equal(res2.isNew, false);
    assert.equal(res2.run.runId, "run_e2e_1");
  });

  test("4. Complete cascade deletion permanently wipes report and returns 204 then 404", async () => {
    const tempReport: AssessmentReport = {
      id: "rep_to_delete_99",
      opportunityId: "opp_del",
      repositoryUrl: "https://github.com/owner/repo",
      resolvedCommitSha: "9".repeat(40),
      status: "completed",
      assessments: [],
      coverageSummary: { total: 0, demonstrated: 0, partiallyDemonstrated: 0, notDemonstrated: 0, needsReview: 0 },
      scannedFilesCount: 2,
      skippedFilesCount: 0,
      createdAt: new Date().toISOString(),
    };

    const createRes = await fetch(`${BASE_URL}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeProvenancedBody(tempReport)),
    });
    const { viewToken } = (await createRes.json()) as any;

    // Verify exists
    const checkRes = await fetch(`${BASE_URL}/api/reports/rep_to_delete_99`, {
      headers: { "X-Report-Token": viewToken },
    });
    assert.equal(checkRes.status, 200);

    // Execute cascade DELETE
    const delRes = await fetch(`${BASE_URL}/api/reports/rep_to_delete_99`, {
      method: "DELETE",
      headers: { "X-Report-Token": viewToken },
    });
    assert.equal(delRes.status, 204);

    // Subsequent retrieval must return 404 Not Found
    const afterDelRes = await fetch(`${BASE_URL}/api/reports/rep_to_delete_99`, {
      headers: { "X-Report-Token": viewToken },
    });
    assert.equal(afterDelRes.status, 404);
  });
});
