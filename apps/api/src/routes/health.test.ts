import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../server.js";

describe("Health and Diagnostic API Routes Suite", () => {
  let server: http.Server;
  let port: number;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test("GET /healthz returns 200 liveness status", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/healthz`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.status, "ok");
    assert.equal(body.service, "parakh-api");
    assert.ok(typeof body.uptime === "number");
  });

  test("GET /api/health returns comprehensive diagnostics", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.status, "ok");
    assert.equal(body.truthfulReporting, true);
    assert.ok(body.storage);
    assert.ok("connected" in body.storage);
    assert.ok("storageMode" in body.storage);
  });

  test("GET /api/health/mongodb returns truthful MongoDB diagnostic", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health/mongodb`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.ok("connected" in body);
    assert.ok("mode" in body);
    assert.ok(typeof body.message === "string");
  });

  test("GET /api/ready returns readiness state", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/ready`);
    // In test environment, returns 200 ready
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.ready, true);
  });

  test("GET /api/ping returns pong", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/ping`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.pong, true);
  });
});
