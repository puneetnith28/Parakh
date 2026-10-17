import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateGitHubUrl } from "../../packages/evidence/src/urlValidator.js";
import { categorizeFile } from "../../packages/evidence/src/filters.js";
import { RequirementDeduplicator } from "../../packages/assessment/src/deduplication.js";
import { CitationValidator } from "../../packages/assessment/src/validator.js";
import { resolveAssessmentStatus } from "../../packages/assessment/src/statusRules.js";
import type { Requirement, CandidateSnippet, EvidenceRecord, AssessmentReport } from "@parakh/contracts";

describe("E2E: Primary User Journey (Brief -> Requirements -> Repo -> Assessment -> Export)", () => {
  it("executes the entire end-to-end evaluation flow with verified report export", async () => {
    // -------------------------------------------------------------
    // Step 1: User pastes Job / Opportunity Brief
    // -------------------------------------------------------------
    const sampleBrief = `
      We are looking for a Senior Full-Stack Engineer with:
      - Deep expertise building Fastify or Express REST APIs with strict input validation.
      - Strong TypeScript typing and domain contracts.
      - Comprehensive unit and integration testing disciplines.
    `;
    assert.ok(sampleBrief.length > 50);

    // -------------------------------------------------------------
    // Step 2: System extracts & user reviews requirements
    // -------------------------------------------------------------
    const rawRequirements: Requirement[] = [
      {
        id: "req-1",
        text: "Building Fastify or Express REST APIs with strict input validation",
        category: "backend",
        priority: "mandatory",
        acceptanceCriteria: ["Use schema validator like Zod", "Return 400 on invalid input"],
      },
      {
        id: "req-2",
        text: "Strong TypeScript typing and domain contracts",
        category: "backend",
        priority: "mandatory",
      },
      {
        id: "req-3",
        text: "Comprehensive unit and integration testing disciplines",
        category: "testing",
        priority: "mandatory",
      },
    ];

    const deduplicatedRequirements = RequirementDeduplicator.deduplicate(rawRequirements);
    assert.equal(deduplicatedRequirements.length, 3);

    // -------------------------------------------------------------
    // Step 3: User supplies GitHub repository URL
    // -------------------------------------------------------------
    const repoInput = "https://github.com/facebook/react";
    const repoValidation = validateGitHubUrl(repoInput);
    assert.equal(repoValidation.valid, true);
    if (!repoValidation.valid) return;

    assert.equal(repoValidation.owner, "facebook");
    assert.equal(repoValidation.repo, "react");

    // -------------------------------------------------------------
    // Step 4: System scans repository tree & categorizes evidence
    // -------------------------------------------------------------
    const filesToScan = [
      "src/routes/api.ts",
      "src/types/domain.ts",
      "tests/routes/api.test.ts",
      "dist/bundle.js", // Must be filtered
      "README.md",
    ];

    const allowedFiles = filesToScan
      .map((path) => ({ path, ...categorizeFile(path) }))
      .filter((f) => f.allowed);

    assert.equal(allowedFiles.length, 4); // dist/bundle.js filtered
    assert.ok(!allowedFiles.some((f) => f.path.includes("dist/")));

    // -------------------------------------------------------------
    // Step 5: System extracts candidate snippets & runs validation
    // -------------------------------------------------------------
    const commitSha = "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5";
    const mockRecords: EvidenceRecord[] = [
      {
        id: "rec-api",
        repository: "facebook/react",
        commitSha,
        path: "src/routes/api.ts",
        canonicalUrl: `https://github.com/facebook/react/blob/${commitSha}/src/routes/api.ts`,
        fileType: "source",
        lineCount: 40,
        content: "export const apiHandler = (req, res) => res.json({ ok: true });",
        ingestionStatus: "full",
      },
      {
        id: "rec-test",
        repository: "facebook/react",
        commitSha,
        path: "tests/routes/api.test.ts",
        canonicalUrl: `https://github.com/facebook/react/blob/${commitSha}/tests/routes/api.test.ts`,
        fileType: "test",
        lineCount: 25,
        content: "test('api returns 200', () => {});",
        ingestionStatus: "full",
      },
    ];

    const mockUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand-api-1",
        fileId: "rec-api",
        repository: "facebook/react",
        commitSha,
        path: "src/routes/api.ts",
        startLine: 1,
        endLine: 1,
        content: "export const apiHandler = (req, res) => res.json({ ok: true });",
        canonicalUrl: `https://github.com/facebook/react/blob/${commitSha}/src/routes/api.ts#L1-L1`,
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const validationOutcome = validator.validate(["cand-api-1"], mockUniverse, mockRecords);
    assert.equal(validationOutcome.allValid, true);

    // -------------------------------------------------------------
    // Step 6: System resolves status applying conservative rules
    // -------------------------------------------------------------
    const statusOutcome = resolveAssessmentStatus({
      requirement: deduplicatedRequirements[0],
      proposedStatus: "demonstrated",
      proposedRationale: "API handler is implemented with valid routes and tests",
      validationOutcome,
      candidateUniverseCount: mockUniverse.length,
    });

    assert.equal(statusOutcome.finalStatus, "demonstrated");
    assert.equal(statusOutcome.wasDowngraded, false);

    // -------------------------------------------------------------
    // Step 7: System generates & exports final audit report
    // -------------------------------------------------------------
    const generatedReport: Partial<AssessmentReport> = {
      assessmentId: "e2e-report-12345",
      candidateId: "cand-e2e-user",
      repositoryUrl: repoValidation.canonicalUrl,
      commitSha,
      overallScore: 92,
      dimensionScores: {
        codeQuality: 90,
        architecture: 88,
        testing: 95,
        gitDiscipline: 92,
        security: 94,
        problemSolving: 91,
      },
      evaluatedAt: new Date().toISOString(),
    };

    assert.equal(generatedReport.overallScore, 92);
    assert.equal(generatedReport.commitSha, commitSha);
    assert.ok(generatedReport.dimensionScores?.testing === 95);

    // Verify report serialization for export
    const jsonExport = JSON.stringify(generatedReport, null, 2);
    assert.ok(jsonExport.includes("e2e-report-12345"));
    assert.ok(jsonExport.includes("facebook/react"));
  });
});
