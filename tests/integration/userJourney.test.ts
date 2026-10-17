import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../../apps/api/src/server.js";
import {
  ExtractedRequirementsResultSchema,
  AssessmentReportSchema,
  type Requirement,
  type AssessmentReport,
} from "@parakh/contracts";
import { setStorage, MemoryReportStorage } from "../../apps/api/src/storage/index.js";
import { runManager } from "../../apps/api/src/services/runManager.js";

describe("Complete End-to-End User Journey Integration Suite", () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;
  let memoryStorage: MemoryReportStorage;
  let originalFetch: typeof fetch;

  before(async () => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = input.toString();
      if (urlStr.includes("api.github.com")) {
        if (urlStr.includes("/languages")) {
          return new Response(JSON.stringify({ TypeScript: 15000 }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (urlStr.includes("/commits/")) {
          return new Response(JSON.stringify({ sha: "c0ffee1234567890abcdef1234567890abcdef12" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (urlStr.includes("/git/trees/")) {
          return new Response(
            JSON.stringify({
              sha: "c0ffee1234567890abcdef1234567890abcdef12",
              truncated: false,
              tree: [
                {
                  path: "src/service.ts",
                  mode: "100644",
                  type: "blob",
                  sha: "blob1234567890abcdef1234567890abcdef12",
                  size: 200,
                  url: "https://api.github.com/repos/parakh-audit/sample-repo/git/blobs/blob1234567890abcdef1234567890abcdef12",
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        if (urlStr.includes("/git/blobs/")) {
          const content = `// High-performance backend microservice with strict type safety\nexport class TransactionService {\n  async process() { return true; }\n}\n`;
          return new Response(
            JSON.stringify({
              content: Buffer.from(content).toString("base64"),
              encoding: "base64",
              size: Buffer.byteLength(content),
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        if (urlStr.includes("/repos/parakh-audit/sample-repo")) {
          return new Response(
            JSON.stringify({
              full_name: "parakh-audit/sample-repo",
              description: "Fixture sample repository for user journey test",
              default_branch: "main",
              private: false,
              stargazers_count: 5,
              forks_count: 1,
              open_issues_count: 0,
              language: "TypeScript",
              updated_at: "2026-10-15T00:00:00Z",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      }
      return originalFetch(input, init);
    };

    memoryStorage = new MemoryReportStorage();
    setStorage(memoryStorage);
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address() as any;
        port = address.port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(() => {
    globalThis.fetch = originalFetch;
    server.close();
    runManager.clear();
  });

  test("Executes full lifecycle from brief extraction, interactive review, analysis, and secure token report retrieval", async () => {
    // -------------------------------------------------------------------------
    // Phase 1 / Step 1: Post opportunity brief to /api/opportunity/text
    // -------------------------------------------------------------------------
    const clientBrief = `
Opportunity Brief: High-Performance Fintech Transaction Service
Client: Apex Capital Trading
Target Scope:
1. Must build resilient backend microservices using Node.js and TypeScript.
2. Must design PostgreSQL database schemas with automated migrations and indexing.
3. Must implement GraphQL resolvers for portfolio queries.
4. Must maintain 85%+ unit and integration test coverage.
5. Preferred: Containerization with Docker and deployment onto Kubernetes.
    `.trim();

    const briefResponse = await fetch(`${baseUrl}/api/opportunity/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: clientBrief,
        title: "Fintech Transaction Platform RFP",
      }),
    });

    assert.equal(briefResponse.status, 200, "Brief extraction must return HTTP 200");
    const extractionResult = (await briefResponse.json()) as any;

    assert.equal(extractionResult.status, "success");
    assert.ok(extractionResult.opportunity.id.startsWith("opp_"));
    assert.equal(extractionResult.opportunity.title, "Fintech Transaction Platform RFP");

    // -------------------------------------------------------------------------
    // Step 2: Validate extracted structured requirements match schema
    // -------------------------------------------------------------------------
    const validatedExtraction = ExtractedRequirementsResultSchema.parse(
      extractionResult.extraction
    );
    assert.ok(
      validatedExtraction.requirements.length >= 2,
      "Extraction must produce at least 2 structured technical requirements"
    );

    const initialRequirements: Requirement[] = validatedExtraction.requirements;
    for (const req of initialRequirements) {
      assert.ok(req.id, "Requirement must have unique ID");
      assert.ok(req.text.length > 5, "Requirement text must be substantive");
      assert.ok(
        [
          "frontend",
          "backend",
          "database",
          "devops",
          "architecture",
          "security",
          "testing",
          "general",
        ].includes(req.category),
        `Category '${req.category}' must belong to valid requirement categories`
      );
      assert.ok(
        ["mandatory", "preferred"].includes(req.priority),
        `Priority '${req.priority}' must be mandatory or preferred`
      );
    }

    // -------------------------------------------------------------------------
    // Step 3: Interactive review & user editing / confirmation
    // Simulate user editing: modifying one requirement and adding custom acceptance criteria
    // -------------------------------------------------------------------------
    const confirmedRequirements: Requirement[] = initialRequirements.map((req, index) => {
      if (index === 0) {
        return {
          ...req,
          text: `${req.text} (verified with strict type safety and linting)`,
          acceptanceCriteria: [
            "All API responses match schema contracts",
            "Zero compiler warnings",
          ],
        };
      }
      return req;
    });

    assert.equal(confirmedRequirements.length, initialRequirements.length);
    assert.ok(confirmedRequirements[0].text.includes("strict type safety"));

    // -------------------------------------------------------------------------
    // Step 4: Submit analysis for fixture repository to /api/analysis
    // -------------------------------------------------------------------------
    const analysisPayload = {
      repositoryUrl: "https://github.com/parakh-audit/sample-repo",
      opportunityId: extractionResult.opportunity.id,
      title: extractionResult.opportunity.title,
      requirements: confirmedRequirements,
    };

    const analysisResponse = await fetch(`${baseUrl}/api/analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analysisPayload),
    });

    assert.equal(analysisResponse.status, 200, "Analysis orchestration must return HTTP 200");
    const analysisResult = (await analysisResponse.json()) as any;

    assert.equal(analysisResult.status, "success");
    assert.ok(analysisResult.report, "Analysis must return a validated report");
    assert.ok(analysisResult.viewToken, "Analysis must issue a cryptographic viewToken");
    assert.equal(
      analysisResult.viewToken.length,
      64,
      "viewToken must be a 256-bit hexadecimal string"
    );

    // -------------------------------------------------------------------------
    // Step 5: Assert pinned commit SHA, citations, and contract integrity
    // -------------------------------------------------------------------------
    const report: AssessmentReport = AssessmentReportSchema.parse(analysisResult.report);

    // Commit SHA must be pinned (40 hex characters)
    assert.match(
      report.resolvedCommitSha,
      /^[0-9a-f]{40}$/i,
      "Report must resolve and pin a 40-character Git commit SHA"
    );
    assert.equal(report.status, "completed");
    assert.equal(report.opportunityId, extractionResult.opportunity.id);

    // Assert coverage summary calculation
    assert.equal(report.coverageSummary.total, confirmedRequirements.length);
    assert.equal(
      report.coverageSummary.demonstrated +
        report.coverageSummary.partiallyDemonstrated +
        report.coverageSummary.notDemonstrated +
        report.coverageSummary.needsReview,
      report.coverageSummary.total,
      "Coverage sum must equal total requirements evaluated"
    );

    // Assert assessment citations and conservative downgrade rules
    for (const assessment of report.assessments) {
      assert.ok(assessment.requirementId, "Each assessment must correspond to a requirement");
      assert.ok(
        ["demonstrated", "partially_demonstrated", "not_demonstrated", "needs_review"].includes(
          assessment.status
        )
      );

      // Rule: If status is demonstrated, must cite candidate evidence
      if (assessment.status === "demonstrated") {
        assert.ok(
          assessment.citations.length > 0,
          `Demonstrated requirement ${assessment.requirementId} must have at least one citation`
        );
        for (const citation of assessment.citations) {
          assert.ok(citation.candidateId, "Citation must have candidateId");
          assert.ok(citation.path, "Citation must cite specific file path");
          assert.match(
            citation.commitSha,
            /^[0-9a-f]{40}$/i,
            "Citation must cite pinned commit SHA"
          );
        }
      }
    }

    // -------------------------------------------------------------------------
    // Step 6: Verify server-side persistence in storage
    // -------------------------------------------------------------------------
    const storedRecord = await memoryStorage.getReportById(report.id);
    assert.ok(storedRecord, "Report must be persisted server-side in storage");
    assert.equal(storedRecord.report.id, report.id);
    assert.equal(storedRecord.viewToken, analysisResult.viewToken);

    // -------------------------------------------------------------------------
    // Step 7: Fetch report by token and verify payload integrity and security
    // -------------------------------------------------------------------------
    // 7a. Unauthorized request without token must be rejected with HTTP 401
    const unauthResponse = await fetch(`${baseUrl}/api/reports/${report.id}`);
    assert.equal(unauthResponse.status, 401, "Fetching report without token must return 401");

    // 7b. Request with invalid/mismatched token must be rejected with HTTP 403
    const badTokenResponse = await fetch(
      `${baseUrl}/api/reports/${report.id}?token=invalid00000000000000000000000000000000000000000000000000000000000000`
    );
    assert.equal(badTokenResponse.status, 403, "Fetching report with bad token must return 403");

    // 7c. Authorized request with valid viewToken must succeed with HTTP 200
    const authResponse = await fetch(
      `${baseUrl}/api/reports/${report.id}?token=${analysisResult.viewToken}`
    );
    assert.equal(authResponse.status, 200, "Fetching report with valid viewToken must return 200");

    const fetchedBody = (await authResponse.json()) as any;
    assert.equal(fetchedBody.status, "success");

    const fetchedReport = AssessmentReportSchema.parse(fetchedBody.report);
    assert.equal(fetchedReport.id, report.id, "Fetched report ID must match generated report ID");
    assert.equal(
      fetchedReport.resolvedCommitSha,
      report.resolvedCommitSha,
      "Fetched commit SHA must match pinned SHA"
    );
    assert.equal(
      fetchedReport.coverageSummary.total,
      report.coverageSummary.total,
      "Coverage total must match exactly"
    );
    assert.equal(
      fetchedReport.coverageSummary.demonstrated,
      report.coverageSummary.demonstrated,
      "Coverage demonstrated count must match exactly"
    );
    assert.equal(
      fetchedReport.assessments.length,
      report.assessments.length,
      "Assessment counts must match exactly"
    );
  });
});
