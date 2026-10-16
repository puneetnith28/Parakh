import test from "node:test";
import assert from "node:assert/strict";
import { AssessmentReport } from "@parakh/contracts";
import { generateHtmlReport, generateJsonReport } from "./reportExporter.js";

test("generateHtmlReport creates self-contained report with zero secret leaks", () => {
  const sampleReport: AssessmentReport = {
    id: "rep_test_123",
    opportunityId: "opp_456",
    repositoryUrl: "https://github.com/sample/repo",
    resolvedCommitSha: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
    status: "completed",
    assessments: [
      {
        requirementId: "req_001",
        requirementText: "Must use React with TypeScript",
        status: "demonstrated",
        rationale: "Found tsx files and package.json config",
        citedCandidateIds: ["cand_001"],
        citations: [
          {
            candidateId: "cand_001",
            repository: "sample/repo",
            commitSha: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
            path: "src/index.tsx",
            canonicalUrl: "https://github.com/sample/repo/blob/master/src/index.tsx",
            evidenceType: "source_code",
            snippet: "import React from 'react';",
            startLine: 1,
            endLine: 10,
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
    skippedFilesCount: 8,
    createdAt: new Date().toISOString(),
  };

  const html = generateHtmlReport(sampleReport, { title: "Audit Report for Client Brief" });

  // Verify structure
  assert.ok(html.includes("Audit Report for Client Brief"));
  assert.ok(html.includes("https://github.com/sample/repo"));
  assert.ok(html.includes("a1b2c3d4e5"));
  assert.ok(html.includes("Must use React with TypeScript"));
  assert.ok(html.includes("@media print"));
  assert.ok(html.includes("Ethical Grounding Disclosure"));

  // Verify no environment variable or internal secrets leakage
  assert.equal(html.includes("AI_STUDIO_API_KEY"), false);
  assert.equal(html.includes("MONGODB_URI"), false);
  assert.equal(html.includes("TIGERDATA_DATABASE_URL"), false);
  assert.equal(html.includes("/home/puneetyadav1625/"), false);

  // Test JSON export
  const json = generateJsonReport(sampleReport);
  const parsed = JSON.parse(json);
  assert.equal(parsed.id, "rep_test_123");
  assert.equal(parsed.assessments[0].requirementId, "req_001");
});
