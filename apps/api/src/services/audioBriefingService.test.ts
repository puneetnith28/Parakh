import test from "node:test";
import assert from "node:assert/strict";
import { AssessmentReport } from "@parakh/contracts";
import { buildExecutiveSummaryText, generateAudioBriefing } from "./audioBriefingService.js";
import { ElevenLabsAdapter } from "@parakh/integrations";

const mockReport: AssessmentReport = {
  id: "rep_audio_test_1",
  opportunityId: "opp_fullstack",
  opportunityTitle: "Senior TypeScript Engineer",
  repositoryUrl: "https://github.com/test-org/candidate-repo",
  resolvedCommitSha: "abcdef1234567890abcdef1234567890abcdef12",
  repoMetadata: {
    owner: "test-org",
    repo: "candidate-repo",
    defaultBranch: "main",
  },
  status: "completed",
  assessments: [
    {
      requirementId: "req_1",
      requirementText: "Implement Sentry tracing in backend services",
      status: "demonstrated",
      rationale: "Found Sentry tracing spans in assessment workflow",
      citedCandidateIds: ["cand_1"],
      citations: [
        {
          path: "src/tracer.ts",
          commitSha: "a".repeat(40),
          repository: "owner/repo",
          canonicalUrl: "https://github.com/owner/repo/blob/master/src/tracer.ts#L10-L25",
          candidateId: "cand_1",
          evidenceType: "ast_definition",
          startLine: 10,
          endLine: 25,
          snippet: "Sentry.startSpan(...)",
        },
      ],
      nextActions: [],
      confidence: "high",
      manuallyOverridden: false,
    },
    {
      requirementId: "req_2",
      requirementText: "Store reports in MongoDB database",
      status: "demonstrated",
      rationale: "Found MongoDB model schemas and connection manager",
      citedCandidateIds: ["cand_2"],
      citations: [],
      nextActions: [],
      confidence: "high",
      manuallyOverridden: false,
    },
    {
      requirementId: "req_3",
      requirementText: "Use Temporal as core workflow orchestrator",
      status: "not_demonstrated",
      rationale: "No active Temporal worker or workflow runtime found",
      citedCandidateIds: [],
      citations: [],
      nextActions: ["Implement Temporal worker"],
      confidence: "medium",
      manuallyOverridden: false,
    },
  ],
  coverageSummary: {
    total: 3,
    demonstrated: 2,
    partiallyDemonstrated: 0,
    notDemonstrated: 1,
    needsReview: 0,
  },
  scannedFilesCount: 42,
  skippedFilesCount: 2,
  createdAt: new Date().toISOString(),
};

test("audioBriefingService: buildExecutiveSummaryText synthesizes strictly grounded summary", () => {
  const summary = buildExecutiveSummaryText(mockReport);

  assert.ok(summary.includes("Senior TypeScript Engineer"));
  assert.ok(summary.includes("candidate-repo"));
  assert.ok(summary.includes("abcdef1")); // short commit sha
  assert.ok(summary.includes("2 of 3 discrete technical requirements verified"));
  assert.ok(summary.includes("1 requirement lacked code implementation evidence"));
  assert.ok(summary.includes("Distributed Tracing with Sentry"));
  assert.ok(summary.includes("MongoDB Atlas Persistence"));
  assert.ok(summary.includes("cryptographically grounded"));
  assert.ok(summary.length <= 800, `Summary length ${summary.length} exceeds 800 characters`);
});

test("audioBriefingService: generateAudioBriefing calls adapter safely", async () => {
  const fakeAudioBase64 = Buffer.from("fake-mp3-bytes").toString("base64");
  const mockFetch = async () =>
    new Response(Buffer.from("fake-mp3-bytes"), {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    });

  const adapter = new ElevenLabsAdapter({
    apiKey: "test-api-key",
    fetchFn: mockFetch as any,
  });

  const result = await generateAudioBriefing(mockReport, adapter);
  assert.equal(result.success, true);
  assert.equal(result.audioBase64, fakeAudioBase64);
  assert.equal(result.mimeType, "audio/mpeg");
  assert.ok(result.durationEstimateSeconds! > 0);
});

test("audioBriefingService: generateAudioBriefing degrades gracefully when unconfigured", async () => {
  const unconfiguredAdapter = new ElevenLabsAdapter({ apiKey: "" });
  const result = await generateAudioBriefing(mockReport, unconfiguredAdapter);

  assert.equal(result.success, false);
  assert.ok(result.skippedReason?.includes("not configured or disabled"));
});
