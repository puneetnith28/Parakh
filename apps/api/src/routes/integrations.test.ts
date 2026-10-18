import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../server.js";
import { config } from "../config.js";

describe("Integration Truthfulness & Status Disclosure Endpoint", () => {
  let server: http.Server;
  const PORT = 3299;
  const BASE_URL = `http://localhost:${PORT}`;

  before(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(PORT, resolve));
  });

  after(() => {
    server.close();
  });

  test("GET /api/integrations/status truthfully reflects configured vs fallback providers", async () => {
    const res = await fetch(`${BASE_URL}/api/integrations/status`);
    assert.equal(res.status, 200);

    const body = await res.json() as any;
    assert.equal(body.status, "success");
    assert.equal(body.truthfulReportingMandate, true);
    assert.ok(body.integrations);

    // 1. Model / Google AI Studio status check
    const gemma = body.integrations.gemma;
    assert.ok(gemma);
    assert.ok(
      gemma.name === "Google AI Studio (Gemini)" ||
      gemma.name === "Google Gemma (Open Weights)"
    );
    assert.ok(gemma.details);
    assert.ok("modelFamily" in gemma.details);
    assert.ok("isGemmaEligible" in gemma.details);
    const hasKey = Boolean(config.AI_STUDIO_API_KEY || config.MODEL_API_KEY);
    assert.equal(gemma.configured, hasKey);
    if (!hasKey || config.MODEL_PROVIDER === "mock") {
      assert.equal(gemma.status, "fallback_mock");
      assert.equal(gemma.isMockOrSimulated, true);
    } else {
      assert.equal(gemma.status, "active");
      assert.equal(gemma.isMockOrSimulated, false);
    }

    // 2. MongoDB Atlas status check
    const mongo = body.integrations.mongodbAtlas;
    assert.ok(mongo);
    assert.equal(typeof mongo.configured, "boolean");

    // 3. Sentry status check
    const sentry = body.integrations.sentry;
    assert.ok(sentry);
    assert.equal(sentry.configured, Boolean(config.SENTRY_DSN));

    // 4. Counts are consistent
    assert.equal(typeof body.activeIntegrationsCount, "number");
    assert.equal(typeof body.fallbackIntegrationsCount, "number");
    assert.equal(
      body.activeIntegrationsCount + body.fallbackIntegrationsCount,
      Object.keys(body.integrations).length
    );
  });
});
