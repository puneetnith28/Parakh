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

  describe("Objective 1: Base URL Validation & Credential Isolation", () => {
    test("accepts canonical public GitHub API destination", () => {
      const client1 = new GitHubClient({ baseUrl: "https://api.github.com" });
      assert.ok(client1);
      const client2 = new GitHubClient({ baseUrl: "https://api.github.com/" });
      assert.ok(client2);
      const client3 = new GitHubClient();
      assert.ok(client3);
    });

    test("rejects insecure HTTP protocol", () => {
      assert.throws(
        () => new GitHubClient({ baseUrl: "http://api.github.com" }),
        /Insecure GitHub API protocol 'http:'. Only 'https:' is permitted./
      );
    });

    test("rejects arbitrary external hosts and permissive suffix domains", () => {
      assert.throws(
        () => new GitHubClient({ baseUrl: "https://evil.com" }),
        /Disallowed GitHub API host 'evil.com'. Only canonical 'api.github.com' is permitted./
      );
      assert.throws(
        () => new GitHubClient({ baseUrl: "https://attacker-api.github.com" }),
        /Disallowed GitHub API host 'attacker-api.github.com'./
      );
      assert.throws(
        () => new GitHubClient({ baseUrl: "https://api.github.com.evil.com" }),
        /Disallowed GitHub API host 'api.github.com.evil.com'./
      );
    });

    test("rejects embedded credentials, non-standard ports, and malformed URLs before fetch", () => {
      let fetchCalled = false;
      const dummyFetch: typeof fetch = async () => {
        fetchCalled = true;
        return new Response("{}");
      };

      assert.throws(
        () =>
          new GitHubClient({
            baseUrl: "https://user:pass@api.github.com",
            fetchFn: dummyFetch,
          }),
        /Embedded credentials in GitHub API base URL are strictly prohibited/
      );

      assert.throws(
        () =>
          new GitHubClient({
            baseUrl: "https://api.github.com:8080",
            fetchFn: dummyFetch,
          }),
        /Non-standard port '8080' is not permitted/
      );

      assert.throws(
        () =>
          new GitHubClient({
            baseUrl: "https://api.github.com/v3",
            fetchFn: dummyFetch,
          }),
        /Unexpected path '\/v3' in GitHub API base URL/
      );

      assert.throws(
        () =>
          new GitHubClient({
            baseUrl: "not-a-valid-url",
            fetchFn: dummyFetch,
          }),
        /Invalid GitHub API base URL 'not-a-valid-url'/
      );

      assert.equal(fetchCalled, false, "Fetch must never be invoked for invalid base URL");
    });

    test("token handling: includes Authorization header only when token is non-empty", async () => {
      let capturedHeadersWithToken: HeadersInit | undefined;
      const mockFetchWithToken: typeof fetch = async (_url, init) => {
        capturedHeadersWithToken = init?.headers;
        return new Response(JSON.stringify({ full_name: "o/r", default_branch: "main" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const clientWithToken = new GitHubClient({
        token: "ghp_validToken12345",
        fetchFn: mockFetchWithToken,
      });
      await clientWithToken.resolveRepoMetadata("o", "r");
      assert.equal(
        (capturedHeadersWithToken as Record<string, string>)?.["Authorization"],
        "Bearer ghp_validToken12345"
      );

      let capturedHeadersNoToken: HeadersInit | undefined;
      const mockFetchNoToken: typeof fetch = async (_url, init) => {
        capturedHeadersNoToken = init?.headers;
        return new Response(JSON.stringify({ full_name: "o/r", default_branch: "main" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const clientWhitespace = new GitHubClient({
        token: "   ",
        fetchFn: mockFetchNoToken,
      });
      await clientWhitespace.resolveRepoMetadata("o", "r");
      assert.equal(
        (capturedHeadersNoToken as Record<string, string>)?.["Authorization"],
        undefined,
        "Whitespace-only token must not generate Authorization header"
      );
    });
  });

  describe("Objective 2: Safe Redirect Behavior", () => {
    test("every outbound request specifies redirect: error policy", async () => {
      const recordedInits: RequestInit[] = [];
      const mockFetch: typeof fetch = async (url, init) => {
        if (init) recordedInits.push(init);
        const urlStr = url.toString();
        if (urlStr.endsWith("/languages")) {
          return new Response(JSON.stringify({ TypeScript: 100 }), { status: 200 });
        }
        if (urlStr.includes("/commits/")) {
          return new Response(JSON.stringify({ sha: "a".repeat(40) }), { status: 200 });
        }
        if (urlStr.includes("/git/trees/")) {
          return new Response(JSON.stringify({ sha: "a".repeat(40), tree: [], truncated: false }), {
            status: 200,
          });
        }
        if (urlStr.includes("/git/blobs/")) {
          return new Response(JSON.stringify({ sha: "b".repeat(40), content: "dGVzdA==", encoding: "base64", size: 4 }), {
            status: 200,
          });
        }
        return new Response(
          JSON.stringify({ full_name: "o/r", default_branch: "main" }),
          { status: 200 }
        );
      };

      const client = new GitHubClient({ fetchFn: mockFetch });
      await client.resolveRepoMetadata("o", "r");
      await client.resolveCommitSha("o", "r", "main");
      await client.fetchTree("o", "r", "a".repeat(40));
      await client.fetchBlob("o", "r", "b".repeat(40));

      assert.ok(recordedInits.length >= 4);
      for (const init of recordedInits) {
        assert.equal(init.redirect, "error", "All outbound GitHub API requests must set redirect: error");
      }
    });

    test("redirect responses fail safely with 502 without following redirect", async () => {
      const mockFetch: typeof fetch = async () => {
        return new Response("Found", {
          status: 302,
          headers: { Location: "https://attacker.com/evil-redirect" },
        });
      };

      const client = new GitHubClient({
        token: "ghp_secret_token",
        fetchFn: mockFetch,
      });

      await assert.rejects(
        async () => client.resolveRepoMetadata("o", "r"),
        (err: unknown) => {
          assert.ok(err instanceof GitHubApiError);
          assert.equal((err as GitHubApiError).statusCode, 502);
          assert.match((err as GitHubApiError).message, /Unexpected redirect response/i);
          return true;
        }
      );
    });

    test("native fetch redirect TypeError fails safely closed", async () => {
      const mockFetch: typeof fetch = async () => {
        throw new TypeError("fetch failed: unexpected redirect");
      };

      const client = new GitHubClient({ fetchFn: mockFetch });
      await assert.rejects(
        async () => client.resolveRepoMetadata("o", "r"),
        (err: unknown) => {
          assert.ok(err instanceof GitHubApiError);
          assert.equal((err as GitHubApiError).statusCode, 502);
          return true;
        }
      );
    });
  });

  describe("Objective 3: Request & Response Body Timeout and Size Limits", () => {
    test("response whose headers arrive promptly but body stalls times out with 504", async () => {
      let streamCancelled = false;
      const mockFetch: typeof fetch = async () => {
        const stalledStream = new ReadableStream({
          start() {
            // Never emits data
          },
          cancel() {
            streamCancelled = true;
          },
        });

        return new Response(stalledStream, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const client = new GitHubClient({
        fetchFn: mockFetch,
        defaultTimeoutMs: 50,
      });

      await assert.rejects(
        async () => client.resolveRepoMetadata("o", "r"),
        (err: unknown) => {
          assert.ok(err instanceof GitHubTimeoutError);
          assert.equal((err as GitHubTimeoutError).statusCode, 504);
          assert.match((err as GitHubTimeoutError).message, /timed out after 50ms/i);
          return true;
        }
      );

      // Verify that stream was cancelled when timeout expired
      assert.equal(streamCancelled, true, "Underlying stream reader must be cancelled on timeout");
    });

    test("rejects response exceeding maximum response byte limit with 413", async () => {
      const largePayload = JSON.stringify({
        data: "X".repeat(2000),
      });

      const mockFetch: typeof fetch = async () => {
        return new Response(largePayload, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": String(largePayload.length),
          },
        });
      };

      const client = new GitHubClient({ fetchFn: mockFetch });
      await assert.rejects(
        async () =>
          client.resolveRepoMetadata("o", "r", {
            maxResponseBytes: 500,
          }),
        (err: unknown) => {
          assert.ok(err instanceof GitHubApiError);
          assert.equal((err as GitHubApiError).statusCode, 413);
          assert.match((err as GitHubApiError).message, /exceeds maximum safety limit/i);
          return true;
        }
      );
    });

    test("cleans up abort listeners upon successful request", async () => {
      const callerController = new AbortController();
      const mockFetch: typeof fetch = async () => {
        return new Response(
          JSON.stringify({ full_name: "o/r", default_branch: "main" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const client = new GitHubClient({ fetchFn: mockFetch });
      const meta = await client.resolveRepoMetadata("o", "r", {
        signal: callerController.signal,
      });
      assert.equal(meta.fullName, "o/r");
      // Aborting after completion must not throw unhandled rejection
      callerController.abort();
    });
  });

  describe("Objective 4: Primary and Secondary Rate Limit Handling", () => {
    test("HTTP 429 with numeric Retry-After header throws GitHubRateLimitError with calculated reset time", async () => {
      const mockFetch: typeof fetch = async () => {
        return new Response(JSON.stringify({ message: "Too Many Requests" }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "retry-after": "120",
          },
        });
      };

      const client = new GitHubClient({ fetchFn: mockFetch });
      const beforeTime = Date.now();
      await assert.rejects(
        async () => client.resolveRepoMetadata("o", "r"),
        (err: unknown) => {
          assert.ok(err instanceof GitHubRateLimitError);
          assert.equal((err as GitHubRateLimitError).statusCode, 429);
          const resetTime = (err as GitHubRateLimitError).resetTimestampMs;
          assert.ok(
            resetTime >= beforeTime + 118000 && resetTime <= beforeTime + 125000,
            `Reset time ${resetTime} should be ~120s from now (${beforeTime})`
          );
          return true;
        }
      );
    });

    test("HTTP 429 with HTTP Date Retry-After header parses reset timestamp correctly", async () => {
      const futureDate = new Date(Date.now() + 180000);
      const httpDateStr = futureDate.toUTCString();

      const mockFetch: typeof fetch = async () => {
        return new Response(JSON.stringify({ message: "Too Many Requests" }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "retry-after": httpDateStr,
          },
        });
      };

      const client = new GitHubClient({ fetchFn: mockFetch });
      await assert.rejects(
        async () => client.resolveRepoMetadata("o", "r"),
        (err: unknown) => {
          assert.ok(err instanceof GitHubRateLimitError);
          assert.equal((err as GitHubRateLimitError).statusCode, 429);
          // Due to second precision in HTTP Date
          assert.ok(
            Math.abs((err as GitHubRateLimitError).resetTimestampMs - futureDate.getTime()) < 2000
          );
          return true;
        }
      );
    });

    test("HTTP 429 with missing Retry-After header falls back to x-ratelimit-reset", async () => {
      const mockFetch: typeof fetch = async () => {
        return new Response(JSON.stringify({ message: "Too Many Requests" }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "x-ratelimit-reset": "1780000000",
            "x-ratelimit-remaining": "0",
          },
        });
      };

      const client = new GitHubClient({ fetchFn: mockFetch });
      await assert.rejects(
        async () => client.resolveRepoMetadata("o", "r"),
        (err: unknown) => {
          assert.ok(err instanceof GitHubRateLimitError);
          assert.equal((err as GitHubRateLimitError).statusCode, 429);
          assert.equal((err as GitHubRateLimitError).resetTimestampMs, 1780000000 * 1000);
          return true;
        }
      );
    });

    test("HTTP 403 with Retry-After header is classified as secondary rate limit", async () => {
      const mockFetch: typeof fetch = async () => {
        return new Response(
          JSON.stringify({
            message: "You have exceeded a secondary rate limit. Please wait a few minutes.",
          }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              "retry-after": "60",
            },
          }
        );
      };

      const client = new GitHubClient({ fetchFn: mockFetch });
      const beforeTime = Date.now();
      await assert.rejects(
        async () => client.resolveRepoMetadata("o", "r"),
        (err: unknown) => {
          assert.ok(err instanceof GitHubRateLimitError);
          assert.equal((err as GitHubRateLimitError).statusCode, 429);
          const resetTime = (err as GitHubRateLimitError).resetTimestampMs;
          assert.ok(
            resetTime >= beforeTime + 58000 && resetTime <= beforeTime + 65000,
            `Expected reset ~60s in future`
          );
          return true;
        }
      );
    });

    test("HTTP 403 with secondary rate limit body message is classified as rate limit even without header", async () => {
      const mockFetch: typeof fetch = async () => {
        return new Response(
          JSON.stringify({
            message: "You have triggered an abuse detection mechanism / secondary rate limit.",
          }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              "x-ratelimit-reset": "1790000000",
            },
          }
        );
      };

      const client = new GitHubClient({ fetchFn: mockFetch });
      await assert.rejects(
        async () => client.resolveRepoMetadata("o", "r"),
        (err: unknown) => {
          assert.ok(err instanceof GitHubRateLimitError);
          assert.equal((err as GitHubRateLimitError).statusCode, 429);
          assert.equal((err as GitHubRateLimitError).resetTimestampMs, 1790000000 * 1000);
          return true;
        }
      );
    });

    test("HTTP 403 without rate limit evidence remains genuine GitHubForbiddenError", async () => {
      const mockFetch: typeof fetch = async () => {
        return new Response(
          JSON.stringify({
            message: "Must have admin rights to Repository.",
          }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              "x-ratelimit-remaining": "4950",
            },
          }
        );
      };

      const client = new GitHubClient({ fetchFn: mockFetch });
      await assert.rejects(
        async () => client.resolveRepoMetadata("o", "r"),
        (err: unknown) => {
          assert.ok(
            err instanceof GitHubForbiddenError,
            "Must be GitHubForbiddenError, not GitHubRateLimitError"
          );
          assert.equal((err as GitHubForbiddenError).statusCode, 403);
          assert.match((err as GitHubForbiddenError).message, /forbidden/i);
          return true;
        }
      );
    });
  });
});
