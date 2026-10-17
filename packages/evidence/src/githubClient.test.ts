import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  GitHubClient,
  GitHubNotFoundError,
  GitHubForbiddenError,
  GitHubRateLimitError,
  GitHubTimeoutError,
  GitHubApiError,
} from "./githubClient.js";

describe("GitHub Repository Metadata Resolution Service", () => {
  test("resolves repository metadata for public repository", async () => {
    const mockFetch: typeof fetch = async (url) => {
      const urlStr = url.toString();
      if (urlStr.endsWith("/languages")) {
        return new Response(JSON.stringify({ TypeScript: 125000, JavaScript: 4500 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          full_name: "test-owner/test-repo",
          description: "A test repository",
          default_branch: "master",
          private: false,
          stargazers_count: 342,
          forks_count: 45,
          open_issues_count: 12,
          language: "TypeScript",
          updated_at: "2026-10-15T12:00:00Z",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    const client = new GitHubClient({ fetchFn: mockFetch });
    const metadata = await client.resolveRepoMetadata("test-owner", "test-repo");

    assert.equal(metadata.owner, "test-owner");
    assert.equal(metadata.repo, "test-repo");
    assert.equal(metadata.defaultBranch, "master");
    assert.equal(metadata.isPrivate, false);
    assert.equal(metadata.stars, 342);
    assert.equal(metadata.languages.TypeScript, 125000);
  });

  test("throws GitHubNotFoundError on 404 response", async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response(JSON.stringify({ message: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    };

    const client = new GitHubClient({ fetchFn: mockFetch });
    await assert.rejects(
      async () => client.resolveRepoMetadata("missing-owner", "ghost-repo"),
      (err: unknown) => {
        assert.ok(err instanceof GitHubNotFoundError);
        assert.equal((err as GitHubNotFoundError).statusCode, 404);
        assert.match((err as GitHubNotFoundError).message, /was not found/i);
        return true;
      }
    );
  });

  test("throws GitHubForbiddenError if repository is private", async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          full_name: "secret/private-repo",
          private: true,
          default_branch: "main",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    const client = new GitHubClient({ fetchFn: mockFetch });
    await assert.rejects(
      async () => client.resolveRepoMetadata("secret", "private-repo"),
      (err: unknown) => {
        assert.ok(err instanceof GitHubForbiddenError);
        assert.match((err as GitHubForbiddenError).message, /private/i);
        return true;
      }
    );
  });

  test("throws GitHubRateLimitError when rate limit is exceeded", async () => {
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
      async () => client.resolveRepoMetadata("owner", "repo"),
      (err: unknown) => {
        assert.ok(err instanceof GitHubRateLimitError);
        assert.equal((err as GitHubRateLimitError).statusCode, 429);
        assert.match((err as GitHubRateLimitError).message, /rate limit exceeded/i);
        return true;
      }
    );
  });

  test("resolves branch ref to immutable 40-character commit SHA", async () => {
    const expectedSha = "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5";
    const mockFetch: typeof fetch = async (url) => {
      assert.ok(url.toString().includes("/commits/main"));
      return new Response(JSON.stringify({ sha: expectedSha }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const client = new GitHubClient({ fetchFn: mockFetch });
    const sha = await client.resolveCommitSha("facebook", "react", "main");
    assert.equal(sha, expectedSha);
    assert.match(sha, /^[0-9a-f]{40}$/);

    const pinned = await client.resolvePinnedRevision("facebook", "react", "main");
    assert.equal(pinned.owner, "facebook");
    assert.equal(pinned.repo, "react");
    assert.equal(pinned.commitSha, expectedSha);
    assert.ok(pinned.resolvedAt);
  });

  test("returns verbatim lowercase SHA if input is already 40-character SHA", async () => {
    const existingSha = "A49A329F5BD8E127E3B6E09E964257125DC457B1";
    let fetchCalled = false;
    const mockFetch: typeof fetch = async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    };

    const client = new GitHubClient({ fetchFn: mockFetch });
    const sha = await client.resolveCommitSha("owner", "repo", existingSha);
    assert.equal(sha, existingSha.toLowerCase());
    assert.equal(fetchCalled, false, "Should not make network call for full 40-char SHA");
  });

  test("throws GitHubNotFoundError when resolving non-existent ref", async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response(JSON.stringify({ message: "No commit found for SHA: ghost-branch" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    };

    const client = new GitHubClient({ fetchFn: mockFetch });
    await assert.rejects(
      async () => client.resolveCommitSha("owner", "repo", "ghost-branch"),
      (err: unknown) => {
        assert.ok(err instanceof GitHubNotFoundError);
        return true;
      }
    );
  });

  test("aborts stalled request and throws GitHubTimeoutError after timeout", async () => {
    const mockFetch: typeof fetch = async (_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("The operation was aborted due to timeout");
          err.name = "TimeoutError";
          reject(err);
        });
      });
    };

    const client = new GitHubClient({ fetchFn: mockFetch, defaultTimeoutMs: 40 });
    await assert.rejects(
      async () => client.resolveRepoMetadata("owner", "repo"),
      (err: unknown) => {
        assert.ok(err instanceof GitHubTimeoutError);
        assert.equal((err as GitHubTimeoutError).statusCode, 504);
        assert.match((err as GitHubTimeoutError).message, /timed out after 40ms/i);
        return true;
      }
    );
  });

  test("preserves caller cancellation signal when caller aborts", async () => {
    const callerController = new AbortController();
    const mockFetch: typeof fetch = async (_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("Caller canceled request");
          err.name = "AbortError";
          reject(err);
        });
      });
    };

    const client = new GitHubClient({ fetchFn: mockFetch, defaultTimeoutMs: 1000 });
    const promise = client.resolveRepoMetadata("owner", "repo", {
      signal: callerController.signal,
    });
    setTimeout(() => callerController.abort(), 10);

    await assert.rejects(
      async () => promise,
      (err: any) => {
        assert.ok(err?.name === "AbortError" || callerController.signal.aborted);
        assert.ok(!(err instanceof GitHubTimeoutError));
        return true;
      }
    );
  });

  test("converts network fetch failure into GitHubApiError with 502 status", async () => {
    const mockFetch: typeof fetch = async () => {
      throw new TypeError("fetch failed: connect ECONNREFUSED 140.82.121.3:443");
    };

    const client = new GitHubClient({ fetchFn: mockFetch });
    await assert.rejects(
      async () => client.resolveRepoMetadata("owner", "repo"),
      (err: unknown) => {
        assert.ok(err instanceof GitHubApiError);
        assert.equal((err as GitHubApiError).statusCode, 502);
        assert.match(
          (err as GitHubApiError).message,
          /Network error communicating with GitHub API/i
        );
        return true;
      }
    );
  });

  test("enforces bounded timeout on fetchTree and fetchBlob", async () => {
    const mockFetch: typeof fetch = async (_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    };

    const client = new GitHubClient({ fetchFn: mockFetch, defaultTimeoutMs: 30 });
    await assert.rejects(
      async () => client.fetchTree("owner", "repo", "a".repeat(40)),
      (err: unknown) => {
        assert.ok(err instanceof GitHubTimeoutError);
        assert.equal((err as GitHubTimeoutError).statusCode, 504);
        return true;
      }
    );

    await assert.rejects(
      async () => client.fetchBlob("owner", "repo", "b".repeat(40)),
      (err: unknown) => {
        assert.ok(err instanceof GitHubTimeoutError);
        assert.equal((err as GitHubTimeoutError).statusCode, 504);
        return true;
      }
    );
  });
});
