import { Router, type Request, type Response, type NextFunction } from "express";
import {
  validateGitHubUrl,
  GitHubClient,
  TreeScanner,
  filterAllowlist,
  ContentFetcher,
  buildBatchEvidenceRecords,
} from "@parakh/evidence";

export const repositoryRouter = Router();

/**
 * POST /api/repository/inspect
 * Validates GitHub URL and resolves repository metadata and pinned commit SHA.
 */
repositoryRouter.post(
  "/api/repository/inspect",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { url, ref } = req.body as { url?: string; ref?: string };

      if (!url) {
        res.status(400).json({ error: "Repository 'url' field is required" });
        return;
      }

      const urlValidation = validateGitHubUrl(url);
      if (!urlValidation.valid) {
        res.status(400).json({ error: urlValidation.error });
        return;
      }

      const { owner, repo, canonicalUrl } = urlValidation;
      const client = new GitHubClient();

      const metadata = await client.resolveRepoMetadata(owner, repo);
      const targetRef = ref?.trim() || metadata.defaultBranch;
      const pinnedRevision = await client.resolvePinnedRevision(owner, repo, targetRef);

      res.status(200).json({
        canonicalUrl,
        metadata,
        pinnedRevision,
      });
    } catch (err: unknown) {
      next(err);
    }
  }
);

/**
 * POST /api/repository/scan
 * Performs bounded repository scanning, content fetching, and evidence record construction.
 */
repositoryRouter.post(
  "/api/repository/scan",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { url, ref, maxPaths, maxFiles } = req.body as {
        url?: string;
        ref?: string;
        maxPaths?: number;
        maxFiles?: number;
      };

      if (!url) {
        res.status(400).json({ error: "Repository 'url' field is required" });
        return;
      }

      const urlValidation = validateGitHubUrl(url);
      if (!urlValidation.valid) {
        res.status(400).json({ error: urlValidation.error });
        return;
      }

      const { owner, repo, canonicalUrl } = urlValidation;
      const client = new GitHubClient();

      const metadata = await client.resolveRepoMetadata(owner, repo);
      const targetRef = ref?.trim() || metadata.defaultBranch;
      const pinnedRevision = await client.resolvePinnedRevision(owner, repo, targetRef);

      // Scan tree at pinned commit SHA
      const scanner = new TreeScanner(client);
      const treeResult = await scanner.scanTree(owner, repo, pinnedRevision.commitSha, {
        maxPaths: maxPaths || 2000,
      });

      // Filter files against allowlist and denylist
      const eligibleFilePaths = new Set(
        filterAllowlist(treeResult.files.map((f) => f.path)).map((f) => f.path)
      );

      const candidateFiles = treeResult.files.filter((f) => eligibleFilePaths.has(f.path));

      // Fetch file contents bounded
      const fetcher = new ContentFetcher(client);
      const batchResult = await fetcher.fetchBatch(
        owner,
        repo,
        pinnedRevision.commitSha,
        candidateFiles,
        {
          maxFiles: maxFiles || 150,
        }
      );

      // Construct standard EvidenceRecord objects
      const records = buildBatchEvidenceRecords(
        owner,
        repo,
        pinnedRevision.commitSha,
        batchResult.fetchedFiles
      );

      res.status(200).json({
        canonicalUrl,
        metadata,
        pinnedRevision,
        totalEntriesScanned: treeResult.totalEntriesScanned,
        candidateFilesCount: candidateFiles.length,
        ingestedRecordsCount: records.length,
        records,
        warnings: batchResult.warnings,
        isTruncated: treeResult.isTruncated,
      });
    } catch (err: unknown) {
      next(err);
    }
  }
);
