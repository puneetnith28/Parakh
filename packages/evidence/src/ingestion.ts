import { type EvidenceRecord, type RepoMetadata } from "@parakh/contracts";
import { validateGitHubUrl } from "./urlValidator.js";
import { GitHubClient } from "./githubClient.js";
import { TreeScanner } from "./treeScanner.js";
import { filterAllowlist } from "./filters.js";
import { ContentFetcher } from "./contentFetcher.js";
import { buildBatchEvidenceRecords } from "./recordBuilder.js";

export interface IngestionOptions {
  client?: GitHubClient;
  ref?: string;
  maxFiles?: number;
  maxPaths?: number;
}

export interface IngestionResult {
  owner: string;
  repo: string;
  canonicalUrl: string;
  metadata: RepoMetadata;
  commitSha: string;
  ref: string;
  records: EvidenceRecord[];
  totalEntriesScanned: number;
  candidateFilesCount: number;
  ingestedRecordsCount: number;
  skippedFilesCount: number;
  warnings: string[];
  isTruncated: boolean;
}

export class RepositoryIngestionService {
  /**
   * Orchestrates immutable repository ingestion:
   * 1. Validates repository URL against SSRF boundaries
   * 2. Resolves repository metadata
   * 3. Resolves and pins the 40-character commit SHA
   * 4. Scans Git tree recursively
   * 5. Filters out build artifacts, binaries, dependencies, and vendor files
   * 6. Fetches file contents bounded to maxFiles
   * 7. Builds standardized, immutable EvidenceRecord objects
   */
  public static async ingest(
    url: string,
    options: IngestionOptions = {}
  ): Promise<IngestionResult> {
    const urlValidation = validateGitHubUrl(url);
    if (!urlValidation.valid) {
      throw new Error(urlValidation.error || "Invalid repository URL");
    }

    const { owner, repo, canonicalUrl } = urlValidation;
    const client = options.client || new GitHubClient();
    const maxFiles = options.maxFiles || 150;
    const maxPaths = options.maxPaths || 2000;

    const metadata = await client.resolveRepoMetadata(owner, repo);
    const targetRef = options.ref?.trim() || metadata.defaultBranch || "main";
    const pinnedRevision = await client.resolvePinnedRevision(owner, repo, targetRef);
    const commitSha = pinnedRevision.commitSha;

    const scanner = new TreeScanner(client);
    const treeResult = await scanner.scanTree(owner, repo, commitSha, {
      maxPaths,
    });

    const totalEntriesScanned = treeResult.totalEntriesScanned;
    const isTruncated = treeResult.isTruncated;

    // Filter against denylist and allowlist
    const eligibleFilePaths = new Set(
      filterAllowlist(treeResult.files.map((f) => f.path)).map((f) => f.path)
    );

    const candidateFiles = treeResult.files.filter((f) => eligibleFilePaths.has(f.path));
    const candidateFilesCount = candidateFiles.length;
    const skippedFilesCount = treeResult.files.length - candidateFiles.length;

    // Fetch file contents boundedly
    const fetcher = new ContentFetcher(client);
    const batchResult = await fetcher.fetchBatch(owner, repo, commitSha, candidateFiles, {
      maxFiles,
    });

    const warnings: string[] = [...batchResult.warnings];

    const records = buildBatchEvidenceRecords(owner, repo, commitSha, batchResult.fetchedFiles);

    return {
      owner,
      repo,
      canonicalUrl,
      metadata,
      commitSha,
      ref: targetRef,
      records,
      totalEntriesScanned,
      candidateFilesCount,
      ingestedRecordsCount: records.length,
      skippedFilesCount,
      warnings,
      isTruncated,
    };
  }
}
