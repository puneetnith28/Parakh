import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../../apps/api/src/server.js";

describe("Security: CORS Policy & Rate Limiting Verification Audit", () => {
  let server: http.Server;
  const PORT = 3199;
  const BASE_URL = `http://localhost:${PORT}`;

  before(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(PORT, resolve));
  });

  after(() => {
    server.close();
  });

  test("CORS: allows configured local frontend origin http://localhost:5173", async () => {
    const res = await fetch(`${BASE_URL}/healthz`, {
      method: "GET",
      headers: {
        Origin: "http://localhost:5173",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:5173");
    assert.equal(res.headers.get("access-control-allow-credentials"), "true");
  });

  test("CORS: rejects unauthorized external origin with 500/blocked response", async () => {
    const res = await fetch(`${BASE_URL}/healthz`, {
      method: "GET",
      headers: {
        Origin: "https://malicious-attacker-domain.com",
      },
    });

    // Express cors middleware triggers Error handled by errorHandler returning 500
    assert.notEqual(res.headers.get("access-control-allow-origin"), "https://malicious-attacker-domain.com");
  });

  test("Rate Limiting: triggers HTTP 429 when threshold exceeded with x-test-rate-limit header", async () => {
    // Send 11 rapid requests with x-test-rate-limit to exercise the limiter
    let lastStatus = 200;
    for (let i = 0; i < 12; i++) {
      const res = await fetch(`${BASE_URL}/api/analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-rate-limit": "true",
        },
        body: JSON.stringify({}),
      });
      lastStatus = res.status;
      if (res.status === 429) {
        const body = await res.json() as any;
        assert.equal(body.code, "RATE_LIMIT_EXCEEDED");
        assert.match(body.message, /Maximum 10 analysis runs per IP per hour allowed/);
        break;
      }
    }

    assert.equal(lastStatus, 429, "Expected 429 Rate Limit Exceeded after exceeding threshold");
  });
});
