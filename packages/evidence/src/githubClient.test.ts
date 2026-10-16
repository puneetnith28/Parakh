import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  GitHubClient,
  GitHubNotFoundError,
  GitHubForbiddenError,
  GitHubRateLimitError,
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
});

