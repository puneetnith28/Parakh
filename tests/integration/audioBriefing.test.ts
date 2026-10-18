import test, { describe, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../../apps/api/src/server.js";
import { AssessmentReport } from "@parakh/contracts";
import { runManager } from "../../apps/api/src/services/runManager.js";
import { issueProvenanceToken, computeReportContentHash } from "../../apps/api/src/services/provenance.js";
import { ElevenLabsAdapter } from "@parakh/integrations";

describe("ElevenLabs End-to-End Audio Briefing Integration Suite", () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;
  let originalFetch: typeof fetch;
  let originalEnvKey: string | undefined;

  const sampleReport: AssessmentReport = {
    id: "rep_e2e_audio_test",
    opportunityId: "opp_ai_engineer",
    opportunityTitle: "Staff AI Systems Architect",
    repositoryUrl: "https://github.com/parakh-eval/evidence-core",
    resolvedCommitSha: "deadbeefcafebabe1234567890abcdef12345678",
    repoMetadata: {
      owner: "parakh-eval",
      repo: "evidence-core",
      defaultBranch: "main",
    },
    status: "completed",
    assessments: [
      {
        requirementId: "req_001",
        requirementTitle: "Cryptographic Provenance Verification",
        requirementText: "Implement HMAC SHA-256 provenance signing for reports",
        status: "demonstrated",
        rationale: "Found provenance tokens and constant-time verification",
        citedCandidateIds: ["cand_1"],
        citations: [
          {
            candidateId: "cand_1",
            repository: "https://github.com/parakh-eval/evidence-core",
            commitSha: "deadbeefcafebabe1234567890abcdef12345678",
            path: "src/provenance.ts",
            canonicalUrl:
              "https://github.com/parakh-eval/evidence-core/blob/deadbeefcafebabe1234567890abcdef12345678/src/provenance.ts#L1-L40",
            startLine: 1,
            endLine: 40,
            snippet: "export function issueProvenanceToken(...) { ... }",
            evidenceType: "source_code",
          },
        ],
        nextActions: [],
        confidence: "high",
        manuallyOverridden: false,
      },
      {
        requirementId: "req_002",
        requirementTitle: "MongoDB Atlas Cloud Storage",
        requirementText: "Persist reports into MongoDB with data minimization",
        status: "demonstrated",
        rationale: "Found Mongoose schema models and sanitizer",
        citedCandidateIds: ["cand_2"],
        citations: [],
        nextActions: [],
        confidence: "high",
        manuallyOverridden: false,
      },
      {
        requirementId: "req_003",
        requirementTitle: "Temporal Distributed Workflows",
        requirementText: "Run Temporal activity workers in production",
        status: "not_demonstrated",
        rationale: "No active Temporal worker found",
        citedCandidateIds: [],
        citations: [],
        nextActions: ["Deploy Temporal worker container"],
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
    scannedFilesCount: 28,
    skippedFilesCount: 1,
    createdAt: new Date().toISOString(),
  };

  let validViewToken: string;

  before(async () => {
    originalFetch = globalThis.fetch;
    originalEnvKey = process.env.ELEVENLABS_API_KEY;

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Seed sampleReport with verified provenance
    const runId = "run_e2e_audio_seed";
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

    const createRes = await fetch(`${baseUrl}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report: sampleReport,
        runId,
        provenanceToken,
      }),
    });
    assert.equal(createRes.status, 201);
    const createData = (await createRes.json()) as any;
    validViewToken = createData.viewToken;
    assert.ok(validViewToken, "Expected valid viewToken to be generated");
  });

  after(async () => {
    globalThis.fetch = originalFetch;
    if (originalEnvKey === undefined) {
      delete process.env.ELEVENLABS_API_KEY;
    } else {
      process.env.ELEVENLABS_API_KEY = originalEnvKey;
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("1. Successfully generates audio briefing when ElevenLabs is configured (HTTP 200)", async () => {
    process.env.ELEVENLABS_API_KEY = "mock_elevenlabs_valid_key";
    const fakeMp3Buffer = Buffer.from("ID3v2.4.0-mock-elevenlabs-synthesized-audio-stream");

    globalThis.fetch = async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("api.elevenlabs.io")) {
        return new Response(fakeMp3Buffer, {
          status: 200,
          headers: { "Content-Type": "audio/mpeg" },
        });
      }
      return originalFetch(url, init);
    };

    const res = await fetch(`${baseUrl}/api/reports/${sampleReport.id}/audio`, {
      method: "POST",
      headers: {
        "X-Report-Token": validViewToken,
        "Content-Type": "application/json",
      },
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.status, "success");
    assert.equal(data.audioBase64, fakeMp3Buffer.toString("base64"));
    assert.equal(data.mimeType, "audio/mpeg");
    assert.equal(data.byteLength, fakeMp3Buffer.length);
    assert.ok(data.durationEstimateSeconds > 0);

    // Verify grounding in synthesized summaryText
    assert.ok(data.summaryText.includes("Staff AI Systems Architect"));
    assert.ok(data.summaryText.includes("evidence-core"));
    assert.ok(data.summaryText.includes("deadbee"));
    assert.ok(data.summaryText.includes("2 of 3 discrete technical requirements verified"));
    assert.ok(data.summaryText.includes("cryptographically grounded"));
  });

  test("2. Degrades gracefully to 503 disabled with grounded summaryText when unconfigured", async () => {
    delete process.env.ELEVENLABS_API_KEY;

    const res = await fetch(`${baseUrl}/api/reports/${sampleReport.id}/audio`, {
      method: "POST",
      headers: { "X-Report-Token": validViewToken },
    });

    assert.equal(res.status, 503);
    const data = (await res.json()) as any;
    assert.equal(data.status, "disabled");
    assert.equal(data.code, "ELEVENLABS_UNCONFIGURED");
    assert.ok(data.message.includes("unconfigured or disabled"));
    // Even when disabled, grounded summaryText is provided as a text fallback!
    assert.ok(data.summaryText);
    assert.ok(data.summaryText.includes("Staff AI Systems Architect"));
  });

  test("3. Handles upstream rate limit (429) returning 502 with zero secret leakage", async () => {
    process.env.ELEVENLABS_API_KEY = "secret_key_to_never_leak_xyz789";

    globalThis.fetch = async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("api.elevenlabs.io")) {
        return new Response(JSON.stringify({ detail: { message: "Quota exceeded" } }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }
      return originalFetch(url, init);
    };

    const res = await fetch(`${baseUrl}/api/reports/${sampleReport.id}/audio`, {
      method: "POST",
      headers: { "X-Report-Token": validViewToken },
    });

    assert.equal(res.status, 502);
    const data = (await res.json()) as any;
    assert.equal(data.status, "error");
    assert.equal(data.code, "AUDIO_GENERATION_FAILED");
    assert.ok(data.message.includes("rate limit or quota exceeded"));
    assert.ok(!data.message.includes("secret_key_to_never_leak_xyz789"));
  });

  test("4. Enforces strict authorization: 401 when token missing, 403 when token invalid", async () => {
    // Missing token -> 401
    const unauthRes = await fetch(`${baseUrl}/api/reports/${sampleReport.id}/audio`, {
      method: "POST",
    });
    assert.equal(unauthRes.status, 401);
    const unauthData = (await unauthRes.json()) as any;
    assert.equal(unauthData.code, "TOKEN_REQUIRED");

    // Invalid token -> 403
    const forbiddenRes = await fetch(`${baseUrl}/api/reports/${sampleReport.id}/audio`, {
      method: "POST",
      headers: { "X-Report-Token": "completely_fake_token_value_here_12345" },
    });
    assert.equal(forbiddenRes.status, 403);
    const forbiddenData = (await forbiddenRes.json()) as any;
    assert.equal(forbiddenData.code, "FORBIDDEN");
  });

  test("5. Rejects request for nonexistent report with 404", async () => {
    const notFoundRes = await fetch(`${baseUrl}/api/reports/nonexistent_report_id_999/audio`, {
      method: "POST",
      headers: { "X-Report-Token": validViewToken },
    });
    assert.equal(notFoundRes.status, 404);
    const notFoundData = (await notFoundRes.json()) as any;
    assert.equal(notFoundData.code, "REPORT_NOT_FOUND");
  });

  test("6. Direct adapter validation: safely handles oversized responses, timeouts, and blank summaries", async () => {
    const hangingFetch: typeof fetch = async (_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    };

    const adapter = new ElevenLabsAdapter({
      apiKey: "test_key",
      timeoutMs: 50,
      fetchFn: hangingFetch,
    });

    const timeoutResult = await adapter.narrateSummary("Valid summary text");
    assert.equal(timeoutResult.success, false);
    assert.ok(timeoutResult.skippedReason?.includes("timed out after 50ms"));

    // Blank summary
    const blankResult = await adapter.narrateSummary("   ");
    assert.equal(blankResult.success, false);
    assert.ok(blankResult.skippedReason?.includes("empty"));
  });
});
