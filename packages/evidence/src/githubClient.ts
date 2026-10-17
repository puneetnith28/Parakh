/**
 * GitHub API Client for Repository Ingestion and Metadata Resolution.
 *
 * Implements public repository inspection via GitHub REST API v3 using native fetch.
 * Honors optional GITHUB_TOKEN for higher rate limits (5,000 req/hr vs 60 req/hr).
 * Extracts rate limit telemetry, default branch, language breakdown, and enforces typed errors.
 */

export interface RepoMetadata {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  isPrivate: boolean;
  stars: number;
  forks: number;
  openIssues: number;
  language: string | null;
  languages: Record<string, number>;
  updatedAt: string;
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: unknown
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export class GitHubNotFoundError extends GitHubApiError {
  constructor(owner: string, repo: string) {
    super(
      `Repository '${owner}/${repo}' was not found on GitHub (HTTP 404). Verify name and visibility.`,
      404
    );
    this.name = "GitHubNotFoundError";
  }
}

export class GitHubForbiddenError extends GitHubApiError {
  constructor(message: string, statusCode = 403) {
    super(message, statusCode);
    this.name = "GitHubForbiddenError";
  }
}

export class GitHubRateLimitError extends GitHubApiError {
  constructor(
    public readonly resetTimestampMs: number,
    public readonly remaining: number
  ) {
    const resetDate = new Date(resetTimestampMs).toISOString();
    super(
      `GitHub API rate limit exceeded (remaining: ${remaining}). Reset scheduled at: ${resetDate}. Provide GITHUB_TOKEN to raise limits.`,
      429
    );
    this.name = "GitHubRateLimitError";
  }
}

export class GitHubTimeoutError extends GitHubApiError {
  constructor(message = "GitHub API request timed out after 10000ms") {
    super(message, 504);
    this.name = "GitHubTimeoutError";
  }
}

export interface GitHubRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface GitHubClientOptions {
  token?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  defaultTimeoutMs?: number;
}

export class GitHubClient {
  private readonly token?: string;
  private readonly baseUrl: string;
  private readonly fetch: typeof fetch;
  private readonly defaultTimeoutMs: number;

  constructor(options: GitHubClientOptions = {}) {
    this.token = options.token || process.env.GITHUB_TOKEN;
    this.baseUrl = (options.baseUrl || "https://api.github.com").replace(/\/$/, "");
    this.fetch = options.fetchFn || globalThis.fetch;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 10000;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Parakh-Evidence-Scanner/1.0",
    };
    if (this.token && this.token.trim().length > 0) {
      headers.Authorization = `Bearer ${this.token.trim()}`;
    }
    return headers;
  }

  private checkRateLimitHeaders(response: Response): void {
    const remaining = response.headers.get("x-ratelimit-remaining");
    const reset = response.headers.get("x-ratelimit-reset");

    if (response.status === 403 || response.status === 429) {
      if (remaining === "0") {
        const resetMs = reset ? parseInt(reset, 10) * 1000 : Date.now() + 60000;
        throw new GitHubRateLimitError(resetMs, 0);
      }
    }
  }

  private async executeFetch(url: string, options?: GitHubRequestOptions): Promise<Response> {
    const headers = this.buildHeaders();
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    const onCallerAbort = () => {
      controller.abort(options?.signal?.reason);
    };

    if (options?.signal) {
      if (options.signal.aborted) {
        clearTimeout(timer);
        throw options.signal.reason ?? new Error("This operation was aborted");
      }
      options.signal.addEventListener("abort", onCallerAbort, { once: true });
    }

    const abortPromise = new Promise<never>((_, reject) => {
      controller.signal.addEventListener(
        "abort",
        () => {
          if (timedOut) {
            reject(
              new GitHubTimeoutError(
                `GitHub API request timed out after ${timeoutMs}ms: GET ${url}`
              )
            );
          } else {
            const err =
              (options?.signal?.reason as Error) || new Error("This operation was aborted");
            reject(err);
          }
        },
        { once: true }
      );
    });

    try {
      const response = await Promise.race([
        this.fetch(url, {
          method: "GET",
          headers,
          signal: controller.signal,
        }),
        abortPromise,
      ]);
      return response;
    } catch (err: any) {
      if (timedOut || err instanceof GitHubTimeoutError) {
        throw err instanceof GitHubTimeoutError
          ? err
          : new GitHubTimeoutError(`GitHub API request timed out after ${timeoutMs}ms: GET ${url}`);
      }
      if (options?.signal?.aborted || err?.name === "AbortError") {
        throw err;
      }
      if (err instanceof GitHubApiError) {
        throw err;
      }
      throw new GitHubApiError(
        `Network error communicating with GitHub API: ${err?.message || String(err)}`,
        502
      );
    } finally {
      clearTimeout(timer);
      if (options?.signal) {
        options.signal.removeEventListener("abort", onCallerAbort);
      }
    }
  }

  /**
   * Resolve repository metadata: existence, visibility, default branch, stars, and languages.
   */
  async resolveRepoMetadata(
    owner: string,
    repo: string,
    options?: GitHubRequestOptions
  ): Promise<RepoMetadata> {
    const repoUrl = `${this.baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

    const response = await this.executeFetch(repoUrl, options);
    this.checkRateLimitHeaders(response);

    if (response.status === 404) {
      throw new GitHubNotFoundError(owner, repo);
    }

    if (response.status === 403) {
      const errorBody = (await response.json().catch(() => ({}))) as { message?: string };
      throw new GitHubForbiddenError(
        `Access to '${owner}/${repo}' forbidden: ${errorBody.message || "Private repository or insufficient permissions"}`
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new GitHubApiError(
        `GitHub API returned unexpected status ${response.status}: ${errorText}`,
        response.status
      );
    }

    const data = (await response.json()) as {
      full_name: string;
      description: string | null;
      default_branch: string;
      private: boolean;
      stargazers_count: number;
      forks_count: number;
      open_issues_count: number;
      language: string | null;
      updated_at: string;
    };

    if (data.private) {
      throw new GitHubForbiddenError(
        `Repository '${owner}/${repo}' is private. Parakh operates exclusively on public repositories.`
      );
    }

    // Fetch language breakdown (optional non-blocking)
    let languages: Record<string, number> = {};
    try {
      const langUrl = `${this.baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`;
      const langRes = await this.executeFetch(langUrl, options);
      this.checkRateLimitHeaders(langRes);
      if (langRes.ok) {
        languages = (await langRes.json()) as Record<string, number>;
      }
    } catch (err: unknown) {
      if (err instanceof GitHubRateLimitError || err instanceof GitHubTimeoutError) {
        throw err;
      }
      // Gracefully fall back to primary language if language api fails
      if (data.language) {
        languages[data.language] = 1;
      }
    }

    return {
      owner,
      repo,
      fullName: data.full_name || `${owner}/${repo}`,
      description: data.description,
      defaultBranch: data.default_branch || "main",
      isPrivate: false,
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      openIssues: data.open_issues_count || 0,
      language: data.language,
      languages,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Resolve a ref (branch, tag, HEAD, or partial SHA) to an immutable 40-character commit SHA.
   */
  async resolveCommitSha(
    owner: string,
    repo: string,
    ref = "HEAD",
    options?: GitHubRequestOptions
  ): Promise<string> {
    const trimmedRef = ref.trim();

    // If already a valid 40-character commit SHA, verify or return
    if (/^[0-9a-f]{40}$/i.test(trimmedRef)) {
      return trimmedRef.toLowerCase();
    }

    const commitUrl = `${this.baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(trimmedRef)}`;

    const response = await this.executeFetch(commitUrl, options);
    this.checkRateLimitHeaders(response);

    if (response.status === 404) {
      throw new GitHubNotFoundError(owner, `${repo} (ref '${trimmedRef}')`);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new GitHubApiError(
        `Failed to resolve commit for ref '${trimmedRef}': HTTP ${response.status} ${errorText}`,
        response.status
      );
    }

    const data = (await response.json()) as { sha?: string };
    if (!data.sha || !/^[0-9a-f]{40}$/i.test(data.sha)) {
      throw new GitHubApiError(
        `GitHub API returned invalid or missing commit SHA for ref '${trimmedRef}': ${JSON.stringify(data)}`,
        500
      );
    }

    return data.sha.toLowerCase();
  }

  /**
   * Resolve and package revision immutability metadata.
   */
  async resolvePinnedRevision(
    owner: string,
    repo: string,
    ref = "HEAD",
    options?: GitHubRequestOptions
  ): Promise<{
    owner: string;
    repo: string;
    ref: string;
    commitSha: string;
    resolvedAt: string;
  }> {
    const commitSha = await this.resolveCommitSha(owner, repo, ref, options);
    return {
      owner,
      repo,
      ref,
      commitSha,
      resolvedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetch recursive Git tree at commit SHA.
   */
  async fetchTree(
    owner: string,
    repo: string,
    commitSha: string,
    options?: GitHubRequestOptions
  ): Promise<{
    sha: string;
    tree: Array<{
      path: string;
      mode: string;
      type: "blob" | "tree" | "commit";
      sha: string;
      size?: number;
      url: string;
    }>;
    truncated: boolean;
  }> {
    const url = `${this.baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(commitSha)}?recursive=1`;

    const response = await this.executeFetch(url, options);
    this.checkRateLimitHeaders(response);

    if (response.status === 404) {
      throw new GitHubNotFoundError(owner, `${repo} (tree for ${commitSha.slice(0, 7)})`);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new GitHubApiError(
        `Failed to scan tree for ${owner}/${repo}@${commitSha.slice(0, 7)}: HTTP ${response.status} ${errorText}`,
        response.status
      );
    }

    return (await response.json()) as {
      sha: string;
      tree: Array<{
        path: string;
        mode: string;
        type: "blob" | "tree" | "commit";
        sha: string;
        size?: number;
        url: string;
      }>;
      truncated: boolean;
    };
  }

  /**
   * Fetch Git blob content by SHA.
   */
  async fetchBlob(
    owner: string,
    repo: string,
    blobSha: string,
    options?: GitHubRequestOptions
  ): Promise<{
    data: { content?: string; encoding?: string; size?: number };
    rateLimitRemaining?: number;
  }> {
    const url = `${this.baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs/${encodeURIComponent(blobSha)}`;

    const response = await this.executeFetch(url, options);
    this.checkRateLimitHeaders(response);

    const remainingStr = response.headers.get("x-ratelimit-remaining");
    const remaining = remainingStr ? parseInt(remainingStr, 10) : undefined;

    if (!response.ok) {
      throw new GitHubApiError(
        `Failed to fetch blob ${blobSha}: HTTP ${response.status}`,
        response.status
      );
    }

    const data = (await response.json()) as { content?: string; encoding?: string; size?: number };
    return { data, rateLimitRemaining: remaining };
  }
}
