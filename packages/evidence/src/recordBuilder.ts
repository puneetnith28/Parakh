import { createHash } from "node:crypto";
import {
  EvidenceRecordSchema,
  type EvidenceRecord,
  type FileType,
  type IngestionStatus,
} from "@parakh/contracts";
import { categorizeFile } from "./filters.js";
import { NormalizedDocument } from "./normalizer.js";
import type { FetchedFileContent } from "./contentFetcher.js";

/**
 * Standardized Evidence Record Builder.
 *
 * Assembles ingested and normalized file content into validated EvidenceRecords
 * conforming to @parakh/contracts with immutable GitHub permalinks.
 */

export interface BuildEvidenceRecordParams {
  owner: string;
  repo: string;
  commitSha: string;
  path: string;
  rawContent: string;
  ingestionStatus?: IngestionStatus;
  explicitFileType?: FileType;
  explicitLanguage?: string;
}

/**
 * Generates an immutable GitHub permalink for a specific file at a pinned commit SHA.
 */
export function buildGitHubPermalink(
  owner: string,
  repo: string,
  commitSha: string,
  filePath: string,
  startLine?: number,
  endLine?: number
): string {
  const cleanPath = filePath.replace(/^\/+/, "");
  const base = `https://github.com/${owner}/${repo}/blob/${commitSha}/${cleanPath}`;
  if (startLine && endLine && startLine === endLine) {
    return `${base}#L${startLine}`;
  }
  if (startLine && endLine && startLine < endLine) {
    return `${base}#L${startLine}-L${endLine}`;
  }
  if (startLine) {
    return `${base}#L${startLine}`;
  }
  return base;
}

/**
 * Build a validated EvidenceRecord for an ingested repository file.
 */
export function buildEvidenceRecord(params: BuildEvidenceRecordParams): EvidenceRecord {
  const {
    owner,
    repo,
    commitSha,
    path,
    rawContent,
    ingestionStatus = "full",
  } = params;

  // Normalize text and compute line metrics
  const doc = new NormalizedDocument(rawContent);

  // Categorize file if not explicitly specified
  const categorization = categorizeFile(path);
  const fileType: FileType = params.explicitFileType || categorization.fileType || "source";
  const language = params.explicitLanguage || categorization.language || undefined;

  // Build immutable permalink
  const canonicalUrl = buildGitHubPermalink(owner, repo, commitSha, path);

  // Generate deterministic ID
  const pathHash = createHash("sha256").update(`${owner}/${repo}:${path}`).digest("hex").slice(0, 16);
  const id = `ev_${pathHash}`;

  const record: EvidenceRecord = {
    id,
    repository: `${owner}/${repo}`,
    commitSha: commitSha.toLowerCase(),
    path,
    canonicalUrl,
    fileType,
    language,
    lineCount: doc.totalLines,
    content: doc.text,
    ingestionStatus,
  };

  // Enforce contract schema validation
  return EvidenceRecordSchema.parse(record);
}

/**
 * Build batch of EvidenceRecords from fetched file contents.
 */
export function buildBatchEvidenceRecords(
  owner: string,
  repo: string,
  commitSha: string,
  fetchedFiles: FetchedFileContent[]
): EvidenceRecord[] {
  return fetchedFiles.map((file) =>
    buildEvidenceRecord({
      owner,
      repo,
      commitSha,
      path: file.path,
      rawContent: file.content,
      ingestionStatus: file.status,
    })
  );
}
