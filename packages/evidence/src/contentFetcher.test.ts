import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ContentFetcher } from "./contentFetcher.js";
import { GitHubClient, GitHubRateLimitError } from "./githubClient.js";

describe("Bounded Content Ingestion & Rate Limit Throttling", () => {
  test("fetches and decodes base64 blob content within bounds", async () => {
    const mockFileContent = "export const greet = (name: string) => `Hello ${name}`;";
    const base64Content = Buffer.from(mockFileContent).toString("base64");

    const mockFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          sha: "blob_sha_1",
          encoding: "base64",
          content: base64Content,
          size: Buffer.byteLength(mockFileContent),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "x-ratelimit-remaining": "50",
          },
        }
      );
    };

    const client = new GitHubClient({ fetchFn: mockFetch });
    const fetcher = new ContentFetcher(client);

    const result = await fetcher.fetchBatch(
      "org",
      "repo",
      "sha123",
      [{ path: "src/greet.ts", sha: "blob_sha_1", size: 100, depth: 2 }],
      { maxBytesPerFile: 1000 }
    );

    assert.equal(result.totalFilesFetched, 1);
    assert.equal(result.skippedCount, 0);
    assert.equal(result.fetchedFiles[0].status, "full");
    assert.equal(result.fetchedFiles[0].content, mockFileContent);
    assert.equal(result.rateLimitRemaining, 50);
  });

  test("skips files that exceed per-file byte threshold", async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response("{}", { status: 200 });
    };

    const client = new GitHubClient({ fetchFn: mockFetch });
    const fetcher = new ContentFetcher(client);

    const result = await fetcher.fetchBatch(
      "org",
      "repo",
      "sha123",
      [{ path: "bigfile.json", sha: "blob_big", size: 500000, depth: 1 }],
      { maxBytesPerFile: 10000 } // 10 KB threshold
    );

    assert.equal(result.totalFilesFetched, 0);
    assert.equal(result.skippedCount, 1);
    assert.equal(result.fetchedFiles[0].status, "skipped");
    assert.match(result.fetchedFiles[0].skipReason || "", /exceeds per-file threshold/i);
  });

  test("triggers rate limit error when GitHub returns 403 rate limit", async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response(JSON.stringify({ message: "API rate limit exceeded" }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "1760000000",
        },
      });
    };

    const client = new GitHubClient({ fetchFn: mockFetch });
    const fetcher = new ContentFetcher(client);

    await assert.rejects(
      async () =>
        fetcher.fetchBatch("org", "repo", "sha123", [
          { path: "src/index.ts", sha: "blob_1", size: 50, depth: 2 },
        ]),
      (err: unknown) => {
        assert.ok(err instanceof GitHubRateLimitError);
        return true;
      }
    );
  });

  test("emits warning when rate limit drops below safety threshold", async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          sha: "b1",
          encoding: "utf-8",
          content: "sample code",
          size: 11,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "x-ratelimit-remaining": "3", // below threshold of 10
          },
        }
      );
    };

    const client = new GitHubClient({ fetchFn: mockFetch });
    const fetcher = new ContentFetcher(client);

    const result = await fetcher.fetchBatch(
      "org",
      "repo",
      "sha123",
      [{ path: "src/index.ts", sha: "b1", size: 11, depth: 2 }],
      { lowRateLimitThreshold: 10 }
    );

    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /rate limit is low/i);
  });
});
