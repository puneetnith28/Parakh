import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateGitHubUrl } from "../../packages/evidence/src/urlValidator.js";
import app from "../../apps/api/src/server.js";

describe("Security: SSRF Defense, URL Validation & Network Boundary Audit", () => {
  const maliciousUrls = [
    // 1. Localhost and loopback
    { url: "http://localhost/org/repo", reason: "localhost hostname" },
    { url: "http://localhost:3000/org/repo", reason: "localhost with port" },
    { url: "http://127.0.0.1/org/repo", reason: "IPv4 loopback" },
    { url: "http://127.0.0.1:8080/org/repo", reason: "IPv4 loopback with port" },
    { url: "http://[::1]/org/repo", reason: "IPv6 loopback" },

    // 2. Cloud Instance Metadata Endpoints (AWS / GCP / Azure)
    { url: "http://169.254.169.254/latest/meta-data/", reason: "AWS/GCP instance metadata" },
    { url: "https://169.254.169.254/computeMetadata/v1/", reason: "GCP metadata endpoint" },
    { url: "http://169.254.169.254/metadata/instance?api-version=2021-02-01", reason: "Azure IMDS metadata" },

    // 3. Private RFC1918 internal network subnets
    { url: "http://10.0.0.1/admin/repo", reason: "10.0.0.0/8 private network" },
    { url: "http://172.16.0.1/internal/repo", reason: "172.16.0.0/12 private network" },
    { url: "http://192.168.1.1/router/repo", reason: "192.168.0.0/16 private network" },

    // 4. Non-HTTP/HTTPS protocols
    { url: "file:///etc/passwd", reason: "file protocol local file disclosure" },
    { url: "gopher://127.0.0.1:6379/_INFO", reason: "gopher protocol SSRF" },
    { url: "ftp://attacker.com/repo", reason: "ftp protocol" },
    { url: "ssh://git@github.com/org/repo", reason: "ssh protocol" },
    { url: "javascript:alert(document.cookie)", reason: "javascript pseudo-protocol" },

    // 5. Embedded userinfo / credential attacks
    { url: "https://admin:secret@github.com/org/repo", reason: "userinfo credential embedding" },
    { url: "https://token@github.com/org/repo", reason: "token in URL authority" },

    // 6. Custom port injection
    { url: "https://github.com:8443/org/repo", reason: "non-standard TLS port" },
    { url: "https://github.com:22/org/repo", reason: "SSH port" },

    // 7. Domain spoofing and open redirect targets
    { url: "https://github.com.attacker.com/org/repo", reason: "subdomain spoofing" },
    { url: "https://not-github.com/org/repo", reason: "unauthorized third-party domain" },
    { url: "https://gitlab.com/org/repo", reason: "unsupported git provider" },
    { url: "https://bitbucket.org/org/repo", reason: "unsupported git provider" },

    // 8. Path traversal and malformed paths
    { url: "https://github.com/../../etc/passwd", reason: "path traversal in repo coordinate" },
    { url: "https://github.com/org", reason: "missing repository coordinate" },
    { url: "https://github.com/", reason: "empty path" },
  ];

  for (const tc of maliciousUrls) {
    it(`strictly rejects ${tc.reason}: ${tc.url}`, () => {
      const res = validateGitHubUrl(tc.url);
      assert.equal(res.valid, false);
      if (!res.valid) {
        assert.ok(typeof res.error === "string" && res.error.length > 0);
      }
    });
  }

  it("API /api/repository/inspect responds with HTTP 400 for malicious SSRF targets", async () => {
    // Test server handler directly using node http request
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      return;
    }

    const port = address.port;
    try {
      const attackPayloads = [
        "http://169.254.169.254/latest/meta-data/",
        "file:///etc/shadow",
        "http://127.0.0.1:3000/api/admin",
      ];

      for (const targetUrl of attackPayloads) {
        const res = await fetch(`http://127.0.0.1:${port}/api/repository/inspect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl }),
        });

        assert.equal(res.status, 400);
        const data = (await res.json()) as any;
        assert.ok(data.error);
      }
    } finally {
      server.close();
    }
  });

  it("approves genuine public canonical GitHub repository URLs", () => {
    const valid = [
      "https://github.com/facebook/react",
      "https://github.com/vercel/next.js",
      "https://github.com/fastify/fastify.git",
    ];

    for (const url of valid) {
      const res = validateGitHubUrl(url);
      assert.equal(res.valid, true);
    }
  });
});
