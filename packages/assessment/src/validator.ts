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

export class CitationValidator {
  /**
   * Deterministically validate cited candidate IDs against candidate universe and repository records.
   */
  validate(
    citedCandidateIds: string[],
    candidateUniverse: CandidateSnippet[],
    repositoryRecords: EvidenceRecord[]
  ): CitationValidationOutcome {
    const universeMap = new Map(candidateUniverse.map((c) => [c.candidateId, c]));
    const recordMap = new Map(repositoryRecords.map((r) => [r.path, r]));

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

      // 2. File path must match an ingested record
      const record = recordMap.get(candidate.path);
      if (!record) {
        rejectedCitations.push({
          candidateId: cid,
          code: "HALLUCINATED_FILE_PATH",
          reason: `Referenced file '${candidate.path}' does not exist in ingested repository snapshot`,
        });
        continue;
      }

      // 3. Line range validation
      const fileLines = record.content.split(/\r?\n/);
      const totalFileLines = record.lineCount || fileLines.length;

      if (
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

      // 4. Content check: must not be empty or whitespace only
      if (!candidate.content || !candidate.content.trim()) {
        rejectedCitations.push({
          candidateId: cid,
          code: "EMPTY_SNIPPET",
          reason: `Candidate snippet for '${candidate.path}' is empty or whitespace`,
        });
        continue;
      }

      // 5. Strict content-line verification: confirm that cited snippet text matches the exact
      // lines in the fetched file content character-for-character (ignoring whitespace).
      const startIdx = Math.max(0, candidate.startLine - 1);
      const endIdx = Math.min(fileLines.length, candidate.endLine);
      const targetLines = fileLines.slice(startIdx, endIdx);
      const targetContent = targetLines.join("\n");

      const stripWhitespace = (text: string) => text.replace(/\s+/g, "");
      const cleanSnippet = stripWhitespace(candidate.content);
      const cleanTarget = stripWhitespace(targetContent);

      const matchesTarget =
        cleanTarget.length > 0 &&
        (cleanTarget.includes(cleanSnippet) || cleanSnippet.includes(cleanTarget));

      if (!matchesTarget) {
        rejectedCitations.push({
          candidateId: cid,
          code: "CONTENT_MISMATCH",
          reason: `Snippet text could not be verified against lines L${candidate.startLine}-L${candidate.endLine} at '${candidate.path}'`,
        });
        continue;
      }

      validCitations.push({
        candidateId: candidate.candidateId,
        repository: record.repository,
        commitSha: record.commitSha,
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
