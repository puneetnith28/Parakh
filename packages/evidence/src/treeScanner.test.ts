import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { TreeScanner } from "./treeScanner.js";
import { GitHubClient } from "./githubClient.js";

describe("Recursive Git Tree Scanner with Bounded Limits", () => {
  test("scans tree and extracts files within depth and count bounds", async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          sha: "c0ffee1234567890abcdef1234567890abcdef12",
          tree: [
            { path: "src", type: "tree", mode: "040000", sha: "s1" },
            { path: "src/index.ts", type: "blob", mode: "100644", sha: "s2", size: 1200 },
            { path: "src/utils", type: "tree", mode: "040000", sha: "s3" },
            { path: "src/utils/math.ts", type: "blob", mode: "100644", sha: "s4", size: 850 },
            { path: "README.md", type: "blob", mode: "100644", sha: "s5", size: 500 },
          ],
          truncated: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const client = new GitHubClient({ fetchFn: mockFetch });
    const scanner = new TreeScanner(client);

    const result = await scanner.scanTree("testorg", "testproject", "c0ffee1234567890abcdef1234567890abcdef12", {
      maxPaths: 10,
      maxDepth: 4,
    });

    assert.equal(result.owner, "testorg");
    assert.equal(result.repo, "testproject");
    assert.equal(result.isTruncated, false);
    assert.equal(result.files.length, 3);
    assert.deepEqual(
      result.files.map((f) => f.path),
      ["src/index.ts", "src/utils/math.ts", "README.md"]
    );
  });

  test("enforces maxDepth boundary and counts skipped entries", async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          sha: "sha123",
          tree: [
            { path: "level1.ts", type: "blob", mode: "100644", sha: "s1", size: 10 },
            { path: "a/level2.ts", type: "blob", mode: "100644", sha: "s2", size: 10 },
            { path: "a/b/level3.ts", type: "blob", mode: "100644", sha: "s3", size: 10 },
            { path: "a/b/c/level4.ts", type: "blob", mode: "100644", sha: "s4", size: 10 },
          ],
          truncated: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const client = new GitHubClient({ fetchFn: mockFetch });
    const scanner = new TreeScanner(client);

    // Limit depth to 2 segments (level1.ts has depth 1, a/level2.ts has depth 2)
    const result = await scanner.scanTree("org", "repo", "sha123", {
      maxDepth: 2,
    });

    assert.equal(result.files.length, 2);
    assert.equal(result.depthExceededCount, 2);
  });

  test("enforces maxPaths boundary and sets truncation metadata", async () => {
    const mockItems = Array.from({ length: 50 }, (_, i) => ({
      path: `file_${i}.ts`,
      type: "blob" as const,
      mode: "100644",
      sha: `sha_${i}`,
      size: 100,
    }));

    const mockFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          sha: "sha123",
          tree: mockItems,
          truncated: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const client = new GitHubClient({ fetchFn: mockFetch });
    const scanner = new TreeScanner(client);

    const result = await scanner.scanTree("org", "repo", "sha123", {
      maxPaths: 5,
    });

    assert.equal(result.files.length, 5);
    assert.equal(result.isTruncated, true);
    assert.match(result.truncationReason || "", /exceeded maximum allowed file limit/i);
  });
});
