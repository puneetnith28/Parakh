import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { AssessmentService } from "./assessmentService.js";
import { GemmaClient } from "@parakh/integrations";
import type { EvidenceRecord, Requirement } from "@parakh/contracts";

describe("AssessmentService Bounded Retries & Graceful Degradation", () => {
  const commitSha = "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5";

  const records: EvidenceRecord[] = [
    {
      id: "ev_1",
      repository: "org/repo",
      commitSha,
      path: "src/auth.ts",
      canonicalUrl: `https://github.com/org/repo/blob/${commitSha}/src/auth.ts`,
      fileType: "source",
      lineCount: 20,
      content: "export function verifyOAuthToken(token: string) { return true; }",
      ingestionStatus: "full",
    },
  ];

  const requirements: Requirement[] = [
    {
      id: "req_auth",
      text: "OAuth token verification",
      category: "backend",
      priority: "mandatory",
    },
  ];

  test("evaluates requirements successfully with mock provider", async () => {
    const service = new AssessmentService();
    const report = await service.evaluateRepository({
      runId: "run_1",
      opportunityId: "opp_1",
      repositoryUrl: "https://github.com/org/repo",
      commitSha,
      requirements,
      records,
    });

    assert.equal(report.status, "completed");
    assert.equal(report.assessments.length, 1);
    assert.equal(report.assessments[0].status, "demonstrated");
  });

  test("retries transient model failure and recovers on second attempt", async () => {
    let callCount = 0;
    const mockFetch: typeof fetch = async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      status: "demonstrated",
                      rationale: "OAuth verified on retry",
                      citedCandidateIds: ["cand_001"],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const client = new GemmaClient({
      provider: "google-ai",
      apiKey: "test_key",
      fetchFn: mockFetch,
    });

    const service = new AssessmentService({
      gemmaClient: client,
      maxRetries: 1,
      backoffMs: 10,
    });

    const report = await service.evaluateRepository({
      runId: "run_retry",
      opportunityId: "opp_1",
      repositoryUrl: "https://github.com/org/repo",
      commitSha,
      requirements,
      records,
    });

    assert.equal(callCount, 2, "Expected exactly 2 attempts (initial + 1 retry)");
    assert.equal(report.assessments[0].status, "demonstrated");
  });

  test("gracefully degrades to needs_review when model persistently fails without crashing overall run", async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response(JSON.stringify({ error: "Service Unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    };

    const client = new GemmaClient({
      provider: "google-ai",
      apiKey: "test_key",
      fetchFn: mockFetch,
    });

    const service = new AssessmentService({
      gemmaClient: client,
      maxRetries: 1,
      backoffMs: 10,
    });

    const report = await service.evaluateRepository({
      runId: "run_degraded",
      opportunityId: "opp_1",
      repositoryUrl: "https://github.com/org/repo",
      commitSha,
      requirements,
      records,
    });

    assert.equal(report.status, "completed");
    assert.equal(report.assessments.length, 1);
    assert.equal(report.assessments[0].status, "needs_review");
    assert.match(report.assessments[0].rationale, /Assessment service temporarily unavailable/i);
    assert.equal(report.assessments[0].downgradeReason, "Degraded due to persistent model API failure");
  });
});
