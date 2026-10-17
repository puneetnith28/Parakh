import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { AssessmentReport } from "@parakh/contracts";
import {
  computeReportContentHash,
  issueProvenanceToken,
  verifyReportProvenance,
} from "../../apps/api/src/services/provenance.js";
import { runManager } from "../../apps/api/src/services/runManager.js";

describe("Cryptographic Report Provenance & Tamper Detection Suite", () => {
  const runId = "run_prov_test_001";
  const reportId = "rep_prov_test_001";
  const opportunityId = "opp_prov_test_001";
  const repositoryUrl = "https://github.com/acme/platform";
  const resolvedCommitSha = "e95ebb9e2b41e7974573735c1db7486812d16f18";

  let baseReport: AssessmentReport;

  beforeEach(() => {
    runManager.clear();

    baseReport = {
      id: reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      status: "completed",
      assessments: [
        {
          requirementId: "req_001",
          requirementText: "Must implement robust cryptographic verification",
          status: "demonstrated",
          rationale: "HMAC-SHA256 signatures bind material report fields",
          confidence: "high",
          citedCandidateIds: ["cand_01"],
          citations: [
            {
              candidateId: "cand_01",
              repository: "acme/platform",
              commitSha: resolvedCommitSha,
              path: "apps/api/src/services/provenance.ts",
              canonicalUrl: `https://github.com/acme/platform/blob/${resolvedCommitSha}/apps/api/src/services/provenance.ts#L10-L25`,
              startLine: 10,
              endLine: 25,
              evidenceType: "source_code",
              snippet: "export function verifyReportProvenance",
            },
          ],
          nextActions: ["Audit key rotation procedure"],
          manuallyOverridden: false,
        },
        {
          requirementId: "req_002",
          requirementText: "Must detect database tampering",
          status: "partially_demonstrated",
          rationale: "Requires end-to-end integration test with database",
          confidence: "medium",
          citedCandidateIds: [],
          citations: [],
          nextActions: ["Add live database verification suite"],
          manuallyOverridden: false,
        },
      ],
      coverageSummary: {
        total: 2,
        demonstrated: 1,
        partiallyDemonstrated: 1,
        notDemonstrated: 0,
        needsReview: 0,
      },
      scannedFilesCount: 45,
      skippedFilesCount: 2,
      limitations: ["Evaluated against snapshot commit e95ebb9e"],
      gapRecommendations: ["Implement automated secret rotation"],
      createdAt: new Date().toISOString(),
    };

    // Register active run in RunManager
    runManager.createOrGetRun({
      runId,
      opportunityId,
      repositoryUrl,
    });

    const contentHash = computeReportContentHash(baseReport);
    runManager.transitionState(runId, "COMPLETED", {
      reportId,
      reportContentHash: contentHash,
    });
  });

  afterEach(() => {
    runManager.clear();
  });

  test("1. A valid unchanged report verifies successfully", () => {
    const contentHash = computeReportContentHash(baseReport);
    const token = issueProvenanceToken({
      runId,
      reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      contentHash,
    });

    const verification = verifyReportProvenance(baseReport, runId, token);
    assert.equal(verification.verified, true);
    assert.equal(verification.reason, undefined);
  });

  test("2. Canonicalization is deterministic for equivalent representations", () => {
    const hash1 = computeReportContentHash(baseReport);

    // Create an equivalent report with:
    // - Reversed assessments order (req_002 before req_001)
    // - Uppercase repository URL and commit SHA
    // - Jumbled citations order within assessment
    const equivalentReport: AssessmentReport = {
      ...baseReport,
      repositoryUrl: "https://GITHUB.COM/Acme/Platform",
      resolvedCommitSha: resolvedCommitSha.toUpperCase(),
      assessments: [baseReport.assessments[1], baseReport.assessments[0]],
      limitations: ["Evaluated against snapshot commit e95ebb9e"],
      gapRecommendations: ["Implement automated secret rotation"],
    };

    const hash2 = computeReportContentHash(equivalentReport);
    assert.equal(hash1, hash2, "Canonical content hashes must be identical regardless of key order or casing");
  });

  test("3. Assessment status tampering is detected and rejected", () => {
    const contentHash = computeReportContentHash(baseReport);
    const token = issueProvenanceToken({
      runId,
      reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      contentHash,
    });

    const tampered = JSON.parse(JSON.stringify(baseReport));
    tampered.assessments[1].status = "demonstrated"; // Tampered: changed partially_demonstrated to demonstrated

    const verification = verifyReportProvenance(tampered, runId, token);
    assert.equal(verification.verified, false);
    assert.match(verification.reason!, /material content altered|signature mismatch/i);
  });

  test("4. Assessment rationale tampering is detected and rejected", () => {
    const contentHash = computeReportContentHash(baseReport);
    const token = issueProvenanceToken({
      runId,
      reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      contentHash,
    });

    const tampered = JSON.parse(JSON.stringify(baseReport));
    tampered.assessments[0].rationale = "Fabricated rationale claimed by attacker";

    const verification = verifyReportProvenance(tampered, runId, token);
    assert.equal(verification.verified, false);
    assert.match(verification.reason!, /material content altered|signature mismatch/i);
  });

  test("5. Citation repository tampering is detected and rejected", () => {
    const contentHash = computeReportContentHash(baseReport);
    const token = issueProvenanceToken({
      runId,
      reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      contentHash,
    });

    const tampered = JSON.parse(JSON.stringify(baseReport));
    tampered.assessments[0].citations[0].repository = "attacker/other-repo";

    const verification = verifyReportProvenance(tampered, runId, token);
    assert.equal(verification.verified, false);
    assert.match(verification.reason!, /material content altered|signature mismatch/i);
  });

  test("6. Citation commit SHA tampering is detected and rejected", () => {
    const contentHash = computeReportContentHash(baseReport);
    const token = issueProvenanceToken({
      runId,
      reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      contentHash,
    });

    const tampered = JSON.parse(JSON.stringify(baseReport));
    tampered.assessments[0].citations[0].commitSha = "0".repeat(40);

    const verification = verifyReportProvenance(tampered, runId, token);
    assert.equal(verification.verified, false);
    assert.match(verification.reason!, /material content altered|signature mismatch/i);
  });

  test("7. Citation file path and URL tampering is detected and rejected", () => {
    const contentHash = computeReportContentHash(baseReport);
    const token = issueProvenanceToken({
      runId,
      reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      contentHash,
    });

    const tampered = JSON.parse(JSON.stringify(baseReport));
    tampered.assessments[0].citations[0].path = "apps/api/src/unauthorized.ts";
    tampered.assessments[0].citations[0].canonicalUrl = `https://github.com/acme/platform/blob/${resolvedCommitSha}/apps/api/src/unauthorized.ts`;

    const verification = verifyReportProvenance(tampered, runId, token);
    assert.equal(verification.verified, false);
    assert.match(verification.reason!, /material content altered|signature mismatch/i);
  });

  test("8. Citation line range and snippet tampering is detected and rejected", () => {
    const contentHash = computeReportContentHash(baseReport);
    const token = issueProvenanceToken({
      runId,
      reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      contentHash,
    });

    const tampered = JSON.parse(JSON.stringify(baseReport));
    tampered.assessments[0].citations[0].startLine = 999;
    tampered.assessments[0].citations[0].snippet = "tampered snippet content";

    const verification = verifyReportProvenance(tampered, runId, token);
    assert.equal(verification.verified, false);
    assert.match(verification.reason!, /material content altered|signature mismatch/i);
  });

  test("9. Coverage summary tampering is detected and rejected", () => {
    const contentHash = computeReportContentHash(baseReport);
    const token = issueProvenanceToken({
      runId,
      reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      contentHash,
    });

    const tampered = JSON.parse(JSON.stringify(baseReport));
    tampered.coverageSummary.demonstrated = 100; // Artificially inflating score

    const verification = verifyReportProvenance(tampered, runId, token);
    assert.equal(verification.verified, false);
    assert.match(verification.reason!, /material content altered|signature mismatch/i);
  });

  test("10. Limitations and gap recommendations tampering is detected and rejected", () => {
    const contentHash = computeReportContentHash(baseReport);
    const token = issueProvenanceToken({
      runId,
      reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      contentHash,
    });

    // Erasing limitations
    const tampered = JSON.parse(JSON.stringify(baseReport));
    tampered.limitations = [];
    tampered.gapRecommendations = ["Fabricated recommendation"];

    const verification = verifyReportProvenance(tampered, runId, token);
    assert.equal(verification.verified, false);
    assert.match(verification.reason!, /material content altered|signature mismatch/i);
  });

  test("11. Scanned and skipped file count tampering is detected and rejected", () => {
    const contentHash = computeReportContentHash(baseReport);
    const token = issueProvenanceToken({
      runId,
      reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      contentHash,
    });

    const tampered = JSON.parse(JSON.stringify(baseReport));
    tampered.scannedFilesCount = 9999;

    const verification = verifyReportProvenance(tampered, runId, token);
    assert.equal(verification.verified, false);
    assert.match(verification.reason!, /material content altered|signature mismatch/i);
  });

  test("12. Cross-report replay is strictly rejected (token from Report A cannot validate Report B)", () => {
    const contentHash = computeReportContentHash(baseReport);
    const token = issueProvenanceToken({
      runId,
      reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      contentHash,
    });

    const differentReport: AssessmentReport = {
      ...baseReport,
      id: "rep_different_victim_002",
    };

    const verification = verifyReportProvenance(differentReport, runId, token);
    assert.equal(verification.verified, false);
    assert.match(verification.reason!, /Report ID mismatch/i);
  });

  test("13. Cross-run replay is strictly rejected (token from Run 1 cannot validate Run 2)", () => {
    const contentHash = computeReportContentHash(baseReport);
    const token = issueProvenanceToken({
      runId,
      reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      contentHash,
    });

    // Register a second distinct run
    const otherRunId = "run_different_run_777";
    runManager.createOrGetRun({
      runId: otherRunId,
      opportunityId,
      repositoryUrl,
    });
    runManager.transitionState(otherRunId, "COMPLETED", {
      reportId,
      reportContentHash: contentHash,
    });

    // Using otherRunId with token generated for runId must fail signature verification
    const verification = verifyReportProvenance(baseReport, otherRunId, token);
    assert.equal(verification.verified, false);
    assert.match(verification.reason!, /signature mismatch/i);
  });

  test("14. Missing, malformed, or invalid integrity metadata is rejected safely", () => {
    // Missing runId
    const res1 = verifyReportProvenance(baseReport, "", "a".repeat(64));
    assert.equal(res1.verified, false);
    assert.match(res1.reason!, /Missing or invalid server analysis run identifier/i);

    // Empty token
    const res2 = verifyReportProvenance(baseReport, runId, "");
    assert.equal(res2.verified, false);
    assert.match(res2.reason!, /Missing or invalid 256-bit provenance token/i);

    // Non-hex token
    const res3 = verifyReportProvenance(baseReport, runId, "not-a-hex-token-at-all".padEnd(64, "z"));
    assert.equal(res3.verified, false);
    assert.match(res3.reason!, /Missing or invalid 256-bit provenance token/i);

    // Non-existent runId
    const res4 = verifyReportProvenance(baseReport, "run_ghost_never_existed", "a".repeat(64));
    assert.equal(res4.verified, false);
    assert.match(res4.reason!, /No active or completed server analysis run found/i);
  });

  test("15. Authoritative server-recorded hash mismatch detects forged tokens", () => {
    // Even if an attacker knew a secret and produced an HMAC, if the submitted report's hash
    // does not match what the server recorded during execution, it is rejected
    const tampered = JSON.parse(JSON.stringify(baseReport));
    tampered.assessments[0].status = "not_demonstrated";

    const forgedContentHash = computeReportContentHash(tampered);
    const forgedToken = issueProvenanceToken({
      runId,
      reportId,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha,
      contentHash: forgedContentHash,
    });

    const verification = verifyReportProvenance(tampered, runId, forgedToken);
    assert.equal(verification.verified, false);
    assert.match(verification.reason!, /Report content does not match the authoritative server analysis run/i);
  });

  test("16. Opportunity title and repository metadata tampering are detected", () => {
    const originalHash = computeReportContentHash(baseReport);

    const tamperedTitle = { ...baseReport, opportunityTitle: "Tampered Staff Engineer Title" };
    assert.notEqual(
      computeReportContentHash(tamperedTitle),
      originalHash,
      "Mutating opportunityTitle must alter content hash"
    );

    const tamperedRepoMeta = {
      ...baseReport,
      repoMetadata: { owner: "malicious-org", repo: "spoofed-repo", defaultBranch: "main" },
    };
    assert.notEqual(
      computeReportContentHash(tamperedRepoMeta),
      originalHash,
      "Mutating repoMetadata must alter content hash"
    );
  });

  test("17. Citation evidenceType tampering is detected", () => {
    const originalHash = computeReportContentHash(baseReport);
    const tamperedCitationType = JSON.parse(JSON.stringify(baseReport));
    tamperedCitationType.assessments[0].citations[0].evidenceType = "documentation";

    assert.notEqual(
      computeReportContentHash(tamperedCitationType),
      originalHash,
      "Mutating citation evidenceType must alter content hash"
    );
  });

  test("18. Manual override flags and user notes tampering are detected", () => {
    const originalHash = computeReportContentHash(baseReport);

    const tamperedOverride = JSON.parse(JSON.stringify(baseReport));
    tamperedOverride.assessments[0].manuallyOverridden = true;
    assert.notEqual(
      computeReportContentHash(tamperedOverride),
      originalHash,
      "Mutating manuallyOverridden flag must alter content hash"
    );

    const tamperedNotes = JSON.parse(JSON.stringify(baseReport));
    tamperedNotes.assessments[0].userNotes = "Attacker injected arbitrary manual justification";
    assert.notEqual(
      computeReportContentHash(tamperedNotes),
      originalHash,
      "Mutating userNotes must alter content hash"
    );
  });

  test("19. Table-driven material report mutations all produce distinct hashes", () => {
    const initialHash = computeReportContentHash(baseReport);

    const testCases: Array<{ name: string; mutate: (rep: AssessmentReport) => void }> = [
      { name: "report.status", mutate: (r) => (r.status = "failed") },
      { name: "assessment.confidence", mutate: (r) => (r.assessments[0].confidence = "low") },
      { name: "assessment.nextActions", mutate: (r) => (r.assessments[0].nextActions = ["Different action"]) },
      { name: "assessment.limitations", mutate: (r) => (r.assessments[0].limitations = "New requirement limitation") },
      { name: "citation.supports", mutate: (r) => (r.assessments[0].citations[0].supports = "Altered support statement") },
      { name: "citation.limitations", mutate: (r) => (r.assessments[0].citations[0].limitations = "Altered limitation statement") },
      { name: "coverage.demonstrated", mutate: (r) => (r.coverageSummary.demonstrated = 99) },
      { name: "report.limitations", mutate: (r) => (r.limitations = ["Altered global limitation"]) },
      { name: "report.gapRecommendations", mutate: (r) => (r.gapRecommendations = ["Altered gap recommendation"]) },
    ];

    for (const tc of testCases) {
      const clone = JSON.parse(JSON.stringify(baseReport));
      tc.mutate(clone);
      const mutatedHash = computeReportContentHash(clone);
      assert.notEqual(
        mutatedHash,
        initialHash,
        `Mutating ${tc.name} must produce a different content hash`
      );
    }
  });
});
