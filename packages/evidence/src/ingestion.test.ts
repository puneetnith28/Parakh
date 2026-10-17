import test from "node:test";
import assert from "node:assert/strict";
import { RepositoryIngestionService } from "./ingestion.js";
import {
  GitHubClient,
  GitHubNotFoundError,
  GitHubForbiddenError,
  GitHubRateLimitError,
  GitHubTimeoutError,
  GitHubApiError,
} from "./githubClient.js";
import { EvidenceRecordSchema } from "@parakh/contracts";

test("RepositoryIngestionService rejects invalid and SSRF repository URLs", async () => {
  const invalidUrls = [
    "http://169.254.169.254/latest/meta-data/",
    "http://localhost:3000/internal",
    "https://gitlab.com/owner/repo",
    "not-a-url",
  ];

  for (const url of invalidUrls) {
    await assert.rejects(
      async () => {
        await RepositoryIngestionService.ingest(url);
      },
      (err: any) => {
        assert.ok(err.message.length > 0);
        return true;
      }
    );
  }
});

test("RepositoryIngestionService pins 40-character commit SHA and produces valid EvidenceRecords with custom client", async () => {
  const mockSha = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
  const mockClient = {
    async resolveRepoMetadata(owner: string, repo: string) {
      return {
        owner,
        repo,
        fullName: `${owner}/${repo}`,
        defaultBranch: "main",
        isPrivate: false,
      };
    },
    async resolvePinnedRevision(owner: string, repo: string, ref: string) {
      return {
        commitSha: mockSha,
        ref,
        resolvedAt: new Date().toISOString(),
      };
    },
    async fetchTree(owner: string, repo: string, commitSha: string) {
      return {
        sha: commitSha,
        truncated: false,
        tree: [
          { path: "src/index.ts", mode: "100644", type: "blob", sha: "blob1", size: 120 },
          { path: "test/index.test.ts", mode: "100644", type: "blob", sha: "blob2", size: 240 },
          { path: "README.md", mode: "100644", type: "blob", sha: "blob3", size: 50 },
        ],
      };
    },
    async fetchBlobContent(_owner: string, _repo: string, _fileSha: string) {
      return "export const hello = 'world';\n";
    },
  };

  const result = await RepositoryIngestionService.ingest("https://github.com/mock-org/mock-repo", {
    client: mockClient as any,
  });

  assert.equal(result.owner, "mock-org");
  assert.equal(result.repo, "mock-repo");
  assert.equal(result.commitSha, mockSha);
  assert.equal(result.records.length, 3);

  for (const record of result.records) {
    const validated = EvidenceRecordSchema.parse(record);
    assert.equal(validated.commitSha, mockSha);
    assert.ok(validated.canonicalUrl.includes(mockSha));
    assert.ok(["source", "test", "doc", "config"].includes(validated.fileType));
  }
});

test("RepositoryIngestionService does not fallback to mock evidence on GitHub 404", async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ message: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  };
  const client = new GitHubClient({ fetchFn: mockFetch });

  await assert.rejects(
    async () => {
      await RepositoryIngestionService.ingest("https://github.com/nonexistent/repo", { client });
    },
    (err: unknown) => {
      assert.ok(err instanceof GitHubNotFoundError);
      assert.equal((err as GitHubNotFoundError).statusCode, 404);
      return true;
    }
  );
});

test("RepositoryIngestionService does not fallback to mock evidence on GitHub 403 private repo", async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        full_name: "private-org/private-repo",
        private: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };
  const client = new GitHubClient({ fetchFn: mockFetch });

  await assert.rejects(
    async () => {
      await RepositoryIngestionService.ingest("https://github.com/private-org/private-repo", {
        client,
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof GitHubForbiddenError);
      assert.equal((err as GitHubForbiddenError).statusCode, 403);
      assert.match((err as GitHubForbiddenError).message, /private/i);
      return true;
    }
  );
});

test("RepositoryIngestionService does not fallback to mock evidence on GitHub rate-limit error (429)", async () => {
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

  await assert.rejects(
    async () => {
      await RepositoryIngestionService.ingest("https://github.com/rate-limited/repo", { client });
    },
    (err: unknown) => {
      assert.ok(err instanceof GitHubRateLimitError);
      assert.equal((err as GitHubRateLimitError).statusCode, 429);
      assert.match((err as GitHubRateLimitError).message, /rate limit exceeded/i);
      return true;
    }
  );
});

test("RepositoryIngestionService does not fallback to mock evidence on network failure", async () => {
  const mockFetch: typeof fetch = async () => {
    throw new TypeError("fetch failed: ENOTFOUND api.github.com");
  };
  const client = new GitHubClient({ fetchFn: mockFetch });

  await assert.rejects(
    async () => {
      await RepositoryIngestionService.ingest("https://github.com/network-fail/repo", { client });
    },
    (err: unknown) => {
      assert.ok(err instanceof GitHubApiError);
      assert.equal((err as GitHubApiError).statusCode, 502);
      assert.match((err as GitHubApiError).message, /Network error communicating with GitHub API/i);
      return true;
    }
  );
});

test("RepositoryIngestionService does not fallback to mock evidence on request timeout", async () => {
  const mockFetch: typeof fetch = async (_url, init) => {
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const err = new Error("The operation was aborted due to timeout");
        err.name = "TimeoutError";
        reject(err);
      });
    });
  };
  const client = new GitHubClient({ fetchFn: mockFetch, defaultTimeoutMs: 30 });

  await assert.rejects(
    async () => {
      await RepositoryIngestionService.ingest("https://github.com/timeout-org/timeout-repo", {
        client,
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof GitHubTimeoutError);
      assert.equal((err as GitHubTimeoutError).statusCode, 504);
      assert.match((err as GitHubTimeoutError).message, /timed out after 30ms/i);
      return true;
    }
  );
});
