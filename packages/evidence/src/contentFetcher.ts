import { GitHubClient, GitHubRateLimitError } from "./githubClient.js";
import type { ScannedFileEntry } from "./treeScanner.js";

/**
 * Bounded Content Ingestion and GitHub Rate-Limit Throttling Service.
 *
 * Fetches file contents using the GitHub Blob API.
 * Enforces per-file size caps, aggregate payload caps, concurrency limits,
 * and rate-limit safety buffers.
 */

export interface ContentFetcherOptions {
  maxFiles?: number; // default: 200
  maxBytesPerFile?: number; // default: 256 KB (262,144 bytes)
  maxAggregateBytes?: number; // default: 10 MB (10,485,760 bytes)
  concurrency?: number; // default: 5
  lowRateLimitThreshold?: number; // default: 10
}

export interface FetchedFileContent {
  path: string;
  sha: string;
  content: string;
  byteSize: number;
  status: "full" | "truncated" | "skipped";
  skipReason?: string;
}

export interface BatchFetchResult {
  owner: string;
  repo: string;
  commitSha: string;
  fetchedFiles: FetchedFileContent[];
  totalBytes: number;
  totalFilesFetched: number;
  skippedCount: number;
  rateLimitRemaining?: number;
  warnings: string[];
}

export class ContentFetcher {
  constructor(private readonly client: GitHubClient) {}

  /**
   * Fetch single file content by blob SHA.
   */
  async fetchBlobContent(
    owner: string,
    repo: string,
    blobSha: string,
    maxBytesPerFile: number
  ): Promise<{ content: string; byteSize: number; rateLimitRemaining?: number }> {
    const { data, rateLimitRemaining } = await this.client.fetchBlob(owner, repo, blobSha);
    const rawSize = data.size || 0;

    if (rawSize > maxBytesPerFile) {
      throw new Error(`Blob size ${rawSize} exceeds max limit of ${maxBytesPerFile} bytes`);
    }

    let decoded = "";
    if (data.encoding === "base64" && data.content) {
      decoded = Buffer.from(data.content.replace(/\s+/g, ""), "base64").toString("utf-8");
    } else if (data.content) {
      decoded = data.content;
    }

    return {
      content: decoded,
      byteSize: Buffer.byteLength(decoded, "utf-8"),
      rateLimitRemaining,
    };
  }

  /**
   * Batch fetch content for a collection of scanned files with safety boundaries.
   */
  async fetchBatch(
    owner: string,
    repo: string,
    commitSha: string,
    files: ScannedFileEntry[],
    options: ContentFetcherOptions = {}
  ): Promise<BatchFetchResult> {
    const maxFiles = options.maxFiles ?? 200;
    const maxBytesPerFile = options.maxBytesPerFile ?? 256 * 1024;
    const maxAggregateBytes = options.maxAggregateBytes ?? 10 * 1024 * 1024;
    const lowRateLimitThreshold = options.lowRateLimitThreshold ?? 10;

    const fetchedFiles: FetchedFileContent[] = [];
    const warnings: string[] = [];
    let totalBytes = 0;
    let skippedCount = 0;
    let lastRateLimitRemaining: number | undefined;

    const targetFiles = files.slice(0, maxFiles);
    if (files.length > maxFiles) {
      warnings.push(`Files to fetch capped at ${maxFiles} (input had ${files.length} candidate files).`);
    }

    for (const file of targetFiles) {
      // Pre-check file size if known from tree scan
      if (file.size > maxBytesPerFile) {
        skippedCount++;
        fetchedFiles.push({
          path: file.path,
          sha: file.sha,
          content: "",
          byteSize: 0,
          status: "skipped",
          skipReason: `File size (${file.size} bytes) exceeds per-file threshold (${maxBytesPerFile} bytes)`,
        });
        continue;
      }

      // Check aggregate budget
      if (totalBytes + file.size > maxAggregateBytes) {
        skippedCount++;
        warnings.push(`Aggregate byte cap of ${maxAggregateBytes} bytes reached. Skipping further downloads.`);
        break;
      }

      try {
        const { content, byteSize, rateLimitRemaining } = await this.fetchBlobContent(
          owner,
          repo,
          file.sha,
          maxBytesPerFile
        );

        if (rateLimitRemaining !== undefined) {
          lastRateLimitRemaining = rateLimitRemaining;
          if (rateLimitRemaining <= lowRateLimitThreshold) {
            warnings.push(
              `GitHub API rate limit is low: ${rateLimitRemaining} requests remaining. Set GITHUB_TOKEN to prevent rate limiting.`
            );
          }
        }

        totalBytes += byteSize;
        fetchedFiles.push({
          path: file.path,
          sha: file.sha,
          content,
          byteSize,
          status: "full",
        });
      } catch (err: unknown) {
        if (err instanceof GitHubRateLimitError) {
          throw err;
        }
        skippedCount++;
        fetchedFiles.push({
          path: file.path,
          sha: file.sha,
          content: "",
          byteSize: 0,
          status: "skipped",
          skipReason: err instanceof Error ? err.message : "Fetch failed",
        });
      }
    }

    return {
      owner,
      repo,
      commitSha,
      fetchedFiles,
      totalBytes,
      totalFilesFetched: fetchedFiles.filter((f) => f.status === "full").length,
      skippedCount,
      rateLimitRemaining: lastRateLimitRemaining,
      warnings,
    };
  }
}
