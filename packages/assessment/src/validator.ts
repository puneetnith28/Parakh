import type { CandidateSnippet, EvidenceRecord, Citation } from "@parakh/contracts";

/**
 * Deterministic Citation Validation Engine.
 *
 * Verifies that all citations proposed by model inference:
 * 1. Exist within the bounded candidate retrieval universe.
 * 2. Correspond to an actual ingested repository file.
 * 3. Fall within legitimate 1-indexed line ranges.
 * 4. Contain verifiable, substantive matching content.
 *
 * Hallucinated, fabricated, or drifted citations are strictly rejected deterministically.
 */

export type CitationRejectionCode =
  | "HALLUCINATED_CANDIDATE_ID"
  | "HALLUCINATED_FILE_PATH"
  | "COMMIT_SHA_MISMATCH"
  | "REPOSITORY_MISMATCH"
  | "CANONICAL_URL_MISMATCH"
  | "INVALID_LINE_RANGE"
  | "CONTENT_MISMATCH"
  | "EMPTY_SNIPPET";

export interface RejectedCitation {
  candidateId: string;
  code: CitationRejectionCode;
  reason: string;
}

export interface CitationValidationOutcome {
  validCitations: Citation[];
  rejectedCitations: RejectedCitation[];
  allValid: boolean;
  validCount: number;
  rejectedCount: number;
}

/**
 * Normalizes file paths across operating systems and leading notation.
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.?\//, "").trim();
}

/**
 * Normalizes source text line-by-line: strips empty lines, collapses internal whitespace.
 */
export function normalizeSnippetText(text: string): string {
  return text
    .split(/\r?\n|\r/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length > 0)
    .join("\n");
}

/**
 * Parses GitHub canonical URL to extract repository, commit SHA, and path coordinates.
 */
function parseGitHubUrl(url: string): { repository?: string; commitSha?: string; path?: string } {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() !== "github.com") return {};
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length >= 4 && segments[2] === "blob") {
      return {
        repository: `${segments[0]}/${segments[1]}`.toLowerCase(),
        commitSha: segments[3].toLowerCase(),
        path: normalizePath(segments.slice(4).join("/")),
      };
    }
  } catch {
    // ignore malformed URLs
  }
  return {};
}

export class CitationValidator {
  /**
   * Deterministically validate cited candidate IDs against candidate universe and repository records.
   * Enforces composite evidence identity (repo:commitSha:path), URL consistency, and strict substantive line matching.
   */
  validate(
    citedCandidateIds: string[],
    candidateUniverse: CandidateSnippet[],
    repositoryRecords: EvidenceRecord[]
  ): CitationValidationOutcome {
    const universeMap = new Map(candidateUniverse.map((c) => [c.candidateId, c]));

    // Composite key indexing: [repo:commit:normPath] -> record
    const compositeRecordMap = new Map<string, EvidenceRecord>();
    // Commit + path index: [commit:normPath] -> record
    const commitPathMap = new Map<string, EvidenceRecord[]>();
    // Path-only index to detect cross-repo or stale-commit errors
    const pathToRecordsMap = new Map<string, EvidenceRecord[]>();

    for (const r of repositoryRecords) {
      const normPath = normalizePath(r.path);
      const repoKey = r.repository.toLowerCase();
      const commitKey = r.commitSha.toLowerCase();
      const compositeKey = `${repoKey}:${commitKey}:${normPath}`;
      compositeRecordMap.set(compositeKey, r);

      const cpKey = `${commitKey}:${normPath}`;
      const cpList = commitPathMap.get(cpKey) || [];
      cpList.push(r);
      commitPathMap.set(cpKey, cpList);

      const pathList = pathToRecordsMap.get(normPath) || [];
      pathList.push(r);
      pathToRecordsMap.set(normPath, pathList);
    }

    const validCitations: Citation[] = [];
    const rejectedCitations: RejectedCitation[] = [];

    // Deduplicate proposed IDs
    const uniqueIds = Array.from(new Set(citedCandidateIds));

    for (const cid of uniqueIds) {
      // 1. Candidate ID must exist in the retrieval universe
      const candidate = universeMap.get(cid);
      if (!candidate) {
        rejectedCitations.push({
          candidateId: cid,
          code: "HALLUCINATED_CANDIDATE_ID",
          reason: `Candidate ID '${cid}' was not provided in candidate evidence universe`,
        });
        continue;
      }

      const candidatePathNorm = normalizePath(candidate.path);
      const candidateCommit = (candidate.commitSha || "").toLowerCase();
      const urlParsed = parseGitHubUrl(candidate.canonicalUrl);

      // 2. Validate canonical URL consistency if valid GitHub permalink
      if (urlParsed.commitSha && urlParsed.commitSha !== candidateCommit) {
        rejectedCitations.push({
          candidateId: cid,
          code: "CANONICAL_URL_MISMATCH",
          reason: `Canonical URL commit SHA '${urlParsed.commitSha}' does not match candidate commit SHA '${candidateCommit}'`,
        });
        continue;
      }

      if (urlParsed.path && urlParsed.path !== candidatePathNorm) {
        rejectedCitations.push({
          candidateId: cid,
          code: "CANONICAL_URL_MISMATCH",
          reason: `Canonical URL path '${urlParsed.path}' does not match candidate path '${candidatePathNorm}'`,
        });
        continue;
      }

      // 3. Composite record lookup with error-specific diagnostics
      let matchedRecord: EvidenceRecord | undefined;

      if (urlParsed.repository) {
        const compositeKey = `${urlParsed.repository}:${candidateCommit}:${candidatePathNorm}`;
        matchedRecord = compositeRecordMap.get(compositeKey);
      }

      if (!matchedRecord) {
        const cpMatches = commitPathMap.get(`${candidateCommit}:${candidatePathNorm}`);
        if (cpMatches && cpMatches.length === 1) {
          matchedRecord = cpMatches[0];
        } else if (cpMatches && cpMatches.length > 1) {
          rejectedCitations.push({
            candidateId: cid,
            code: "REPOSITORY_MISMATCH",
            reason: `Ambiguous duplicate path '${candidatePathNorm}' across multiple repositories; explicit repository identity required`,
          });
          continue;
        }
      }

      // If still not matched, check path-level diagnostics
      if (!matchedRecord) {
        const existingPathRecords = pathToRecordsMap.get(candidatePathNorm);
        if (!existingPathRecords || existingPathRecords.length === 0) {
          rejectedCitations.push({
            candidateId: cid,
            code: "HALLUCINATED_FILE_PATH",
            reason: `Referenced file '${candidate.path}' does not exist in ingested repository snapshot`,
          });
          continue;
        }

        // Check if commit SHA drifted or mismatched
        const hasMatchingCommit = existingPathRecords.some(
          (r) => r.commitSha.toLowerCase() === candidateCommit
        );
        if (!hasMatchingCommit) {
          rejectedCitations.push({
            candidateId: cid,
            code: "COMMIT_SHA_MISMATCH",
            reason: `Candidate references commit '${candidateCommit}', but repository evidence is pinned to '${existingPathRecords[0].commitSha}'`,
          });
          continue;
        }

        // Check if repository mismatched
        if (urlParsed.repository) {
          rejectedCitations.push({
            candidateId: cid,
            code: "REPOSITORY_MISMATCH",
            reason: `Candidate canonical URL repository '${urlParsed.repository}' does not match ingested repository '${existingPathRecords[0].repository}'`,
          });
          continue;
        }

        matchedRecord = existingPathRecords[0];
      }

      // Verify repository match if URL has repo
      if (urlParsed.repository && urlParsed.repository !== matchedRecord.repository.toLowerCase()) {
        rejectedCitations.push({
          candidateId: cid,
          code: "REPOSITORY_MISMATCH",
          reason: `Canonical URL references repository '${urlParsed.repository}', but evidence belongs to '${matchedRecord.repository}'`,
        });
        continue;
      }

      // 4. Line range bounds validation with safe newline handling
      const fileLines =
        matchedRecord.content.length === 0 ? [] : matchedRecord.content.split(/\r?\n|\r/);
      const totalFileLines = matchedRecord.lineCount || fileLines.length;

      if (
        totalFileLines === 0 ||
        candidate.startLine < 1 ||
        candidate.endLine < candidate.startLine ||
        candidate.endLine > totalFileLines
      ) {
        rejectedCitations.push({
          candidateId: cid,
          code: "INVALID_LINE_RANGE",
          reason: `Line range L${candidate.startLine}-L${candidate.endLine} is invalid for file with ${totalFileLines} lines`,
        });
        continue;
      }

      // 5. Empty or whitespace snippet check
      if (!candidate.content || !candidate.content.trim()) {
        rejectedCitations.push({
          candidateId: cid,
          code: "EMPTY_SNIPPET",
          reason: `Candidate snippet for '${candidate.path}' is empty or whitespace`,
        });
        continue;
      }

      // 6. Strict substantive line matching & partial snippet abuse prevention
      const startIdx = Math.max(0, candidate.startLine - 1);
      const endIdx = Math.min(fileLines.length, candidate.endLine);
      const targetLines = fileLines.slice(startIdx, endIdx);
      const targetContent = targetLines.join("\n");

      const normSnippet = normalizeSnippetText(candidate.content);
      const normTarget = normalizeSnippetText(targetContent);

      if (normTarget.length === 0) {
        rejectedCitations.push({
          candidateId: cid,
          code: "CONTENT_MISMATCH",
          reason: `Snippet text could not be verified against lines L${candidate.startLine}-L${candidate.endLine} at '${candidate.path}' (target lines are empty)`,
        });
        continue;
      }

      // Exact normalized match is always accepted
      let isSubstantiveMatch = normSnippet === normTarget;

      if (!isSubstantiveMatch) {
        // Enforce substantive ratio to prevent partial snippet abuse (must cover >= 70% of target lines)
        // and prevent snippet hallucination (snippet cannot exceed target content length)
        const lengthRatio = normSnippet.length / normTarget.length;
        const containsContent = normTarget.includes(normSnippet);

        if (containsContent && lengthRatio >= 0.7 && lengthRatio <= 1.05) {
          isSubstantiveMatch = true;
        }
      }

      if (!isSubstantiveMatch) {
        rejectedCitations.push({
          candidateId: cid,
          code: "CONTENT_MISMATCH",
          reason: `Snippet text could not be verified against lines L${candidate.startLine}-L${candidate.endLine} at '${candidate.path}': does not substantively match target lines`,
        });
        continue;
      }

      validCitations.push({
        candidateId: candidate.candidateId,
        repository: matchedRecord.repository,
        commitSha: matchedRecord.commitSha,
        path: candidate.path,
        canonicalUrl: candidate.canonicalUrl,
        startLine: candidate.startLine,
        endLine: candidate.endLine,
        evidenceType: candidate.fileType,
        snippet: candidate.content,
      });
    }

    return {
      validCitations,
      rejectedCitations,
      allValid: rejectedCitations.length === 0,
      validCount: validCitations.length,
      rejectedCount: rejectedCitations.length,
    };
  }
}
