import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../server.js";
import { AssessmentReport } from "@parakh/contracts";

test("Reports API: Authorization token lifecycle and security enforcement", async () => {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3097, resolve));

  try {
    const sampleReport: AssessmentReport = {
      id: "rep_auth_test_1",
      opportunityId: "opp_1",
      repositoryUrl: "https://github.com/owner/repo",
      resolvedCommitSha: "c0ffee".repeat(6) + "1234",
      status: "completed",
      assessments: [
        {
          requirementId: "req_001",
          requirementText: "Must use React",
          status: "demonstrated",
          rationale: "Found React",
          citedCandidateIds: [],
          citations: [],
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
      scannedFilesCount: 10,
      skippedFilesCount: 1,
      createdAt: new Date().toISOString(),
    };

    // 1a. Fabricated report without provenance MUST return 403 Forbidden
    const unprovenancedRes = await fetch("http://localhost:3097/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleReport),
    });
    assert.equal(unprovenancedRes.status, 403);
    const unprovenancedJson = (await unprovenancedRes.json()) as any;
    assert.equal(unprovenancedJson.code, "UNTRUSTED_REPORT_PROVENANCE");

    // 1b. Fabricated report with invalid/tampered provenance token MUST return 403 Forbidden
    const tamperedRes = await fetch("http://localhost:3097/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report: sampleReport,
        runId: "run_fake_123",
        provenanceToken: "f".repeat(64),
      }),
    });
    assert.equal(tamperedRes.status, 403);
    const tamperedJson = (await tamperedRes.json()) as any;
    assert.equal(tamperedJson.code, "INVALID_PROVENANCE_SIGNATURE");

    // 1c. Valid server-provenanced report MUST succeed and return 201 Created
    const { runManager } = await import("../services/runManager.js");
    const { issueProvenanceToken, computeReportContentHash } = await import("../services/provenance.js");
    const runId = "run_auth_test_1";
    runManager.createOrGetRun({
      runId,
      opportunityId: sampleReport.opportunityId,
      repositoryUrl: sampleReport.repositoryUrl,
    });
    const contentHash = computeReportContentHash(sampleReport);
    runManager.transitionState(runId, "COMPLETED", {
      reportId: sampleReport.id,
      reportContentHash: contentHash,
    });
    const provenanceToken = issueProvenanceToken({
      runId,
      reportId: sampleReport.id,
      opportunityId: sampleReport.opportunityId,
      repositoryUrl: sampleReport.repositoryUrl,
      resolvedCommitSha: sampleReport.resolvedCommitSha,
      contentHash,
    });

    // 1d. Assessment status tampering rejected: changing status to 'needs_review' invalidates provenance
    const tamperedStatusReport = JSON.parse(JSON.stringify(sampleReport));
    tamperedStatusReport.assessments[0].status = "needs_review";
    const statusTamperedRes = await fetch("http://localhost:3097/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report: tamperedStatusReport,
        runId,
        provenanceToken,
      }),
    });
    assert.equal(statusTamperedRes.status, 403);
    const statusTamperedJson = (await statusTamperedRes.json()) as any;
    assert.equal(statusTamperedJson.code, "INVALID_PROVENANCE_SIGNATURE");

    // 1e. Citation tampering rejected: fabricating a citation invalidates provenance
    const tamperedCitationReport = JSON.parse(JSON.stringify(sampleReport));
    tamperedCitationReport.assessments[0].citations = [
      {
        candidateId: "cand_forged",
        repository: "owner/repo",
        commitSha: sampleReport.resolvedCommitSha,
        path: "src/secret.ts",
        canonicalUrl: "https://github.com/owner/repo/blob/c0ffee/src/secret.ts",
        snippet: "forged snippet",
      },
    ];
    const citationTamperedRes = await fetch("http://localhost:3097/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report: tamperedCitationReport,
        runId,
        provenanceToken,
      }),
    });
    assert.equal(citationTamperedRes.status, 403);
    const citationTamperedJson = (await citationTamperedRes.json()) as any;
    assert.equal(citationTamperedJson.code, "INVALID_PROVENANCE_SIGNATURE");

    // 1f. Rationale and coverage summary tampering rejected
    const tamperedCoverageReport = JSON.parse(JSON.stringify(sampleReport));
    tamperedCoverageReport.coverageSummary.demonstrated = 999;
    const coverageTamperedRes = await fetch("http://localhost:3097/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report: tamperedCoverageReport,
        runId,
        provenanceToken,
      }),
    });
    assert.equal(coverageTamperedRes.status, 403);
    const coverageTamperedJson = (await coverageTamperedRes.json()) as any;
    assert.equal(coverageTamperedJson.code, "INVALID_PROVENANCE_SIGNATURE");

    // 1g. Cross-report token reuse rejected: using token on another report ID
    const otherReport = JSON.parse(JSON.stringify(sampleReport));
    otherReport.id = "rep_different_id_999";
    const crossReportRes = await fetch("http://localhost:3097/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report: otherReport,
        runId,
        provenanceToken,
      }),
    });
    assert.equal(crossReportRes.status, 403);
    const crossReportJson = (await crossReportRes.json()) as any;
    assert.equal(crossReportJson.code, "INVALID_PROVENANCE_SIGNATURE");

    // 1h. Malformed token rejected
    const malformedTokenRes = await fetch("http://localhost:3097/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report: sampleReport,
        runId,
        provenanceToken: "not-a-valid-hex-token",
      }),
    });
    assert.equal(malformedTokenRes.status, 403);

    // 1i. Now submit UNMODIFIED legitimate report -> MUST succeed with 201 Created
    const createRes = await fetch("http://localhost:3097/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report: sampleReport,
        runId,
        provenanceToken,
      }),
    });

    assert.equal(createRes.status, 201);
    const createJson = (await createRes.json()) as any;
    assert.equal(createJson.status, "success");
    assert.ok(createJson.viewToken);
    assert.equal(typeof createJson.viewToken, "string");
    assert.equal(createJson.viewToken.length, 64); // 32 bytes hex

    const validToken = createJson.viewToken;

    // 2. Access WITHOUT token should return 401 Unauthorized
    const unauthRes = await fetch(`http://localhost:3097/api/reports/${sampleReport.id}`);
    assert.equal(unauthRes.status, 401);
    const unauthJson = (await unauthRes.json()) as any;
    assert.equal(unauthJson.code, "TOKEN_REQUIRED");

    // 3. Access WITH INVALID token should return 403 Forbidden
    const invalidRes = await fetch(`http://localhost:3097/api/reports/${sampleReport.id}`, {
      headers: { "X-Report-Token": "bad_token_1234567890abcdefbad_token_1234567890abcdef" },
    });
    assert.equal(invalidRes.status, 403);
    const invalidJson = (await invalidRes.json()) as any;
    assert.equal(invalidJson.code, "FORBIDDEN");

    // 4. Access WITH VALID token in X-Report-Token header should return 200 OK
    const authHeaderRes = await fetch(`http://localhost:3097/api/reports/${sampleReport.id}`, {
      headers: { "X-Report-Token": validToken },
    });
    assert.equal(authHeaderRes.status, 200);
    const authHeaderJson = (await authHeaderRes.json()) as any;
    assert.equal(authHeaderJson.status, "success");
    assert.equal(authHeaderJson.report.id, sampleReport.id);

    // 5. Access WITH VALID token in query param (?token=) should also succeed (read-only share link)
    const queryParamRes = await fetch(
      `http://localhost:3097/api/reports/${sampleReport.id}?token=${validToken}`
    );
    assert.equal(queryParamRes.status, 200);
    const queryParamJson = (await queryParamRes.json()) as any;
    assert.equal(queryParamJson.report.id, sampleReport.id);

    // 6. Share endpoint returns read-only token link
    const shareRes = await fetch(`http://localhost:3097/api/reports/${sampleReport.id}/share`, {
      method: "POST",
      headers: { "X-Report-Token": validToken },
    });
    assert.equal(shareRes.status, 200);
    const shareJson = (await shareRes.json()) as any;
    assert.ok(shareJson.shareUrl.includes(validToken));

    // 7. DELETE with valid token returns 204 No Content
    const deleteRes = await fetch(`http://localhost:3097/api/reports/${sampleReport.id}`, {
      method: "DELETE",
      headers: { "X-Report-Token": validToken },
    });
    assert.equal(deleteRes.status, 204);

    // 8. Subsequent GET returns 404 Not Found
    const afterDeleteRes = await fetch(`http://localhost:3097/api/reports/${sampleReport.id}`, {
      headers: { "X-Report-Token": validToken },
    });
    assert.equal(afterDeleteRes.status, 404);
  } finally {
    server.close();
  }
});
