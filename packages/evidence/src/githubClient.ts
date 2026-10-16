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
    super(`Repository '${owner}/${repo}' was not found on GitHub (HTTP 404). Verify name and visibility.`, 404);
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

export interface GitHubClientOptions {
  token?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export class GitHubClient {
  private readonly token?: string;
  private readonly baseUrl: string;
  private readonly fetch: typeof fetch;

  constructor(options: GitHubClientOptions = {}) {
    this.token = options.token || process.env.GITHUB_TOKEN;
    this.baseUrl = (options.baseUrl || "https://api.github.com").replace(/\/$/, "");
    this.fetch = options.fetchFn || globalThis.fetch;
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

  /**
   * Resolve repository metadata: existence, visibility, default branch, stars, and languages.
   */
  async resolveRepoMetadata(owner: string, repo: string): Promise<RepoMetadata> {
    const repoUrl = `${this.baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const headers = this.buildHeaders();

    const response = await this.fetch(repoUrl, { method: "GET", headers });
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
      const langRes = await this.fetch(langUrl, { method: "GET", headers });
      if (langRes.ok) {
        languages = (await langRes.json()) as Record<string, number>;
      }
    } catch {
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
}
