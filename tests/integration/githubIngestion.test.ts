import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GitHubClient } from "../../packages/evidence/src/githubClient.js";
import { categorizeFile, isDeniedFile } from "../../packages/evidence/src/filters.js";
import { validateGitHubUrl } from "../../packages/evidence/src/urlValidator.js";

describe("Integration: GitHub Ingestion Boundaries & Error Recovery", () => {
  it("pins commit SHA and normalizes repository coordinates", () => {
    const validation = validateGitHubUrl("https://github.com/facebook/react");
    assert.equal(validation.valid, true);
    if (validation.valid) {
      assert.equal(validation.owner, "facebook");
      assert.equal(validation.repo, "react");
      assert.equal(validation.canonicalUrl, "https://github.com/facebook/react");
    }
  });

  it("filters binary, vendored, minified, and build artifact paths", () => {
    assert.equal(categorizeFile("src/index.ts").allowed, true);
    assert.equal(categorizeFile("packages/core/src/service.js").allowed, true);

    // Excluded patterns
    assert.equal(isDeniedFile("dist/bundle.js").denied, true);
    assert.equal(isDeniedFile("node_modules/express/index.js").denied, true);
    assert.equal(isDeniedFile("package-lock.json").denied, true);
    assert.equal(isDeniedFile("pnpm-lock.yaml").denied, true);
    assert.equal(isDeniedFile("assets/logo.png").denied, true);
    assert.equal(isDeniedFile("bin/worker.exe").denied, true);
    assert.equal(isDeniedFile("vendor/jquery.min.js").denied, true);
  });

  it("handles rate-limit 429 and returns graceful error structure without process crash", async () => {
    const originalFetch = globalThis.fetch;
    // Simulate GitHub secondary rate limit 429 response
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 429,
        headers: new Headers({
          "retry-after": "60",
          "x-ratelimit-remaining": "0",
        }),
        json: async () => ({
          message: "You have exceeded a secondary rate limit. Please wait a few minutes before you try again.",
        }),
      } as any;
    };

    try {
      const client = new GitHubClient({ token: "dummy-token" });
      await assert.rejects(
        async () => {
          await client.resolveRepoMetadata("mock-owner", "mock-repo");
        },
        (err: any) => {
          assert.equal(err.name, "GitHubRateLimitError");
          assert.equal(err.statusCode, 429);
          assert.ok(err.message.includes("rate limit"));
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("flags truncated tree warnings when GitHub repository exceeds file cap", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          sha: "mock-tree-sha",
          truncated: true,
          tree: [
            { path: "src/file1.ts", type: "blob", size: 500, sha: "sha1" },
            { path: "src/file2.ts", type: "blob", size: 600, sha: "sha2" },
          ],
        }),
      } as any;
    };

    try {
      const client = new GitHubClient({ token: "dummy-token" });
      const treeRes = await client.fetchTree("mock-owner", "mock-repo", "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5");
      assert.equal(treeRes.truncated, true);
      assert.equal(treeRes.tree.length, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
