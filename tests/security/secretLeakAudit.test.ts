import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scrubSecrets, scrubObject } from "../../apps/api/src/utils/scrubber.js";
import { sentryBeforeSend } from "../../apps/api/src/observability/sentry.js";
import { getStorage } from "../../apps/api/src/storage/index.js";
import type { AssessmentReport } from "@parakh/contracts";

describe("Security: Privacy, Secret Leakage, & Redaction Verification Audit", () => {
  it("scrubs database connection passwords from log lines and error strings", () => {
    const rawMongo = "mongodb+srv://admin:SuperSecretPass123!@cluster0.mongodb.net/parakh?retryWrites=true";
    const scrubbedMongo = scrubSecrets(rawMongo);
    assert.ok(!scrubbedMongo.includes("SuperSecretPass123!"));
    assert.ok(scrubbedMongo.includes("[REDACTED_PASSWORD]"));

    const rawPostgres = "postgres://tsdbadmin:pgpassword999@tsdb.cloud.timescale.com:32805/tsdb";
    const scrubbedPostgres = scrubSecrets(rawPostgres);
    assert.ok(!scrubbedPostgres.includes("pgpassword999"));
    assert.ok(scrubbedPostgres.includes("[REDACTED_PASSWORD]"));
  });

  it("scrubs personal access tokens and bearer headers", () => {
    const rawGithub = "Token: ghp_1111222233334444555566667777888899990000";
    const scrubbedGithub = scrubSecrets(rawGithub);
    assert.ok(!scrubbedGithub.includes("ghp_1111222233334444555566667777888899990000"));
    assert.ok(scrubbedGithub.includes("[REDACTED_GITHUB_TOKEN]"));

    const rawBearer = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature";
    const scrubbedBearer = scrubSecrets(rawBearer);
    assert.ok(!scrubbedBearer.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"));
    assert.ok(scrubbedBearer.includes("[REDACTED_BEARER_TOKEN]"));
  });

  it("scrubs private keys and Google AI Studio keys", () => {
    const rawKey = "AIzaSyD-mockGoogleAiStudioKey12345678901"; // 35 chars after AIza
    const scrubbedKey = scrubSecrets(rawKey);
    assert.ok(!scrubbedKey.includes("AIzaSyD"));
    assert.ok(scrubbedKey.includes("[REDACTED_AI_STUDIO_KEY]"));

    const rawPrivKey = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0mockkey...\n-----END RSA PRIVATE KEY-----";
    const scrubbedPrivKey = scrubSecrets(rawPrivKey);
    assert.ok(!scrubbedPrivKey.includes("MIIEowIBAAKCAQEA0mockkey"));
    assert.ok(scrubbedPrivKey.includes("[REDACTED_PRIVATE_KEY]"));
  });

  it("sentryBeforeSend scrubs breadcrumbs, request data, and exception messages", () => {
    const mockEvent: any = {
      exception: {
        values: [
          {
            value: "Connection to mongodb+srv://user:secretpw@cluster.mongodb.net failed with timeout",
          },
        ],
      },
      breadcrumbs: [
        {
          message: "API dispatch with Authorization: Bearer secret-token-xyz-1234567890123456",
          data: {
            authHeader: "Bearer secret-token-xyz-1234567890123456",
          },
        },
      ],
      request: {
        headers: {
          authorization: "Bearer secret-token-xyz-1234567890123456",
        },
        query_string: "apiKey=AIzaSyD-mockGoogleAiStudioKey12345678901",
      },
    };

    const scrubbedEvent = sentryBeforeSend(mockEvent);
    assert.ok(scrubbedEvent);

    // Exception check
    assert.ok(!scrubbedEvent.exception?.values?.[0]?.value?.includes("secretpw"));
    assert.ok(scrubbedEvent.exception?.values?.[0]?.value?.includes("[REDACTED_PASSWORD]"));

    // Breadcrumb check
    assert.ok(!scrubbedEvent.breadcrumbs?.[0]?.message?.includes("secret-token"));
    assert.ok(!JSON.stringify(scrubbedEvent.breadcrumbs?.[0]?.data).includes("secret-token"));

    // Request check
    assert.ok(!scrubbedEvent.request?.query_string?.includes("AIzaSyD"));
  });

  it("ensures exported assessment reports contain zero plaintext environment credentials", async () => {
    const report: any = {
      id: "sec-audit-report-1",
      assessmentId: "sec-audit-report-1",
      candidateId: "cand-security-audit",
      repositoryUrl: "https://github.com/facebook/react",
      commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
      overallScore: 89,
      dimensionScores: {
        codeQuality: 88,
        architecture: 85,
        testing: 90,
        gitDiscipline: 92,
        security: 95,
        problemSolving: 84,
      },
      status: "completed",
      assessments: [
        {
          requirementId: "req-1",
          status: "demonstrated",
          score: 95,
          confidence: 0.95,
          rationale: "Clean AST implementation with automated tests.",
          limitations: "None detected.",
          nextActions: ["Proceed with architectural evaluation."],
          citations: [
            {
              candidateId: "cand_001",
              canonicalUrl: "https://github.com/facebook/react/blob/sha/src/index.ts#L10-L25",
              path: "src/index.ts",
              startLine: 10,
              endLine: 25,
              evidenceType: "code",
              confidence: 0.95,
              relevanceSummary: "React hook implementation",
              snippet: "export function useMemo() { ... }",
            },
          ],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const storage = getStorage();
    await storage.saveReport(report, "test-view-token-123");
    const fetchedRecord = await storage.getReportById("sec-audit-report-1");
    assert.ok(fetchedRecord);

    const serialized = JSON.stringify(fetchedRecord.report);

    // Assert zero secret patterns present
    assert.ok(!serialized.includes("ghp_"));
    assert.ok(!serialized.includes("AIza"));
    assert.ok(!serialized.includes("password"));
    assert.ok(!serialized.includes("mongodb+srv://"));
    assert.ok(!serialized.includes("postgres://"));
  });
});
