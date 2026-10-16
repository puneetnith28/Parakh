import { GitHubClient } from "./githubClient.js";

/**
 * Recursive Git Tree Scanner with Bounded Depth and File Count Caps.
 *
 * Traverses public repository trees using GitHub Git Data API.
 * Prevents DoS on gigantic monorepos by capping total entries and directory nesting depth.
 */

export interface TreeScanOptions {
  maxPaths?: number; // default: 2,000
  maxDepth?: number; // default: 8
}

export interface ScannedFileEntry {
  path: string;
  sha: string;
  size: number;
  depth: number;
}

export interface TreeScanResult {
  owner: string;
  repo: string;
  commitSha: string;
  totalEntriesScanned: number;
  files: ScannedFileEntry[];
  directories: string[];
  isTruncated: boolean;
  truncationReason?: string;
  depthExceededCount: number;
}

export class TreeScanner {
  constructor(private readonly client: GitHubClient) {}

  /**
   * Scan repository tree at a pinned commit SHA with strict boundary limits.
   */
  async scanTree(
    owner: string,
    repo: string,
    commitSha: string,
    options: TreeScanOptions = {}
  ): Promise<TreeScanResult> {
    const maxPaths = options.maxPaths ?? 2000;
    const maxDepth = options.maxDepth ?? 8;

    const data = await this.client.fetchTree(owner, repo, commitSha);

    const files: ScannedFileEntry[] = [];
    const directories: string[] = [];
    let isTruncated = Boolean(data.truncated);
    let truncationReason = data.truncated ? "GitHub API truncated tree response (>100,000 entries)" : undefined;
    let depthExceededCount = 0;
    let totalEntries = 0;

    for (const item of data.tree || []) {
      totalEntries++;

      // Compute directory depth (1-indexed based on path segments)
      const segments = item.path.split("/");
      const depth = segments.length;

      if (item.type === "tree") {
        if (depth <= maxDepth) {
          directories.push(item.path);
        }
        continue;
      }

      if (item.type === "blob") {
        if (depth > maxDepth) {
          depthExceededCount++;
          continue;
        }

        if (files.length >= maxPaths) {
          isTruncated = true;
          truncationReason = `Tree scan exceeded maximum allowed file limit of ${maxPaths} entries`;
          break;
        }

        files.push({
          path: item.path,
          sha: item.sha,
          size: item.size || 0,
          depth,
        });
      }
    }

    return {
      owner,
      repo,
      commitSha,
      totalEntriesScanned: totalEntries,
      files,
      directories,
      isTruncated,
      truncationReason,
      depthExceededCount,
    };
  }
}
