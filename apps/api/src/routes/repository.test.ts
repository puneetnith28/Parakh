import { test, describe } from "node:test";
import assert from "node:assert/strict";
import app from "../server.js";

describe("Repository API Route & Error Diagnostics", () => {
  test("POST /api/repository/inspect rejects missing url with 400", async () => {
    // Send request via internal node test using supertest-like fetch against listening or simulated handler
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 3000;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 400);
      const data = (await res.json()) as { error: string };
      assert.match(data.error, /url.*required/i);
    } finally {
      server.close();
    }
  });

  test("POST /api/repository/inspect rejects SSRF and invalid domain URLs with 400", async () => {
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 3000;

    try {
      const maliciousUrls = [
        "http://169.254.169.254/latest/meta-data/",
        "http://localhost:3000/internal",
        "https://gitlab.com/owner/repo",
      ];

      for (const url of maliciousUrls) {
        const res = await fetch(`http://127.0.0.1:${port}/api/repository/inspect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        assert.equal(res.status, 400);
        const data = (await res.json()) as { error: string };
        assert.ok(data.error.length > 0);
      }
    } finally {
      server.close();
    }
  });

  test("POST /api/repository/scan rejects missing url with 400", async () => {
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 3000;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 400);
      const data = (await res.json()) as { error: string };
      assert.match(data.error, /url.*required/i);
    } finally {
      server.close();
    }
  });
});
