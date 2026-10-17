import { test, describe } from "node:test";
import assert from "node:assert/strict";
import app from "../server.js";
import { AssessmentReportSchema } from "@parakh/contracts";

describe("Analysis Orchestration Route Suite", () => {
  test("POST /api/analysis rejects empty requirements with 400", async () => {
    const server = app.listen(0);
    const address = server.address() as any;
    const port = address.port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repositoryUrl: "https://github.com/facebook/react",
          requirements: [],
        }),
      });

      assert.equal(res.status, 400);
      const data = (await res.json()) as any;
      assert.equal(data.status, "error");
      assert.ok(data.message.includes("Invalid analysis request parameters"));
    } finally {
      server.close();
    }
  });

  test("POST /api/analysis rejects SSRF target URLs with 400", async () => {
    const server = app.listen(0);
    const address = server.address() as any;
    const port = address.port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repositoryUrl: "http://169.254.169.254/latest/meta-data/",
          requirements: [
            {
              id: "req_001",
              text: "Implement backend service",
              category: "backend",
              priority: "mandatory",
            },
          ],
        }),
      });

      assert.equal(res.status, 400);
      const data = (await res.json()) as any;
      assert.equal(data.status, "error");
    } finally {
      server.close();
    }
  });

  test("POST /api/analysis orchestrates full capability evaluation returning valid report", async () => {
    const server = app.listen(0);
    const address = server.address() as any;
    const port = address.port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: "opp_test_001",
          title: "Fullstack Capability Test",
          repositoryUrl: "https://github.com/expressjs/express",
          requirements: [
            {
              id: "req_001",
              text: "Implement express routing and middleware handling",
              category: "backend",
              priority: "mandatory",
            },
            {
              id: "req_002",
              text: "Provide automated test suites verifying API responses",
              category: "testing",
              priority: "mandatory",
            },
          ],
        }),
      });

      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.equal(data.status, "success");
      assert.ok(data.report);

      // Validate report contract
      const validatedReport = AssessmentReportSchema.parse(data.report);
      assert.equal(validatedReport.assessments.length, 2);
      assert.ok(validatedReport.coverageSummary.total === 2);
      assert.ok(typeof validatedReport.scannedFilesCount === "number");
      assert.ok(validatedReport.status === "completed");
    } finally {
      server.close();
    }
  });
});
