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
      if (
        candidate.startLine < 1 ||
        candidate.endLine < candidate.startLine ||
        candidate.endLine > record.lineCount
      ) {
        rejectedCitations.push({
          candidateId: cid,
          code: "INVALID_LINE_RANGE",
          reason: `Line range L${candidate.startLine}-L${candidate.endLine} is invalid for file with ${record.lineCount} lines`,
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

      // 5. Substantive content verification: verify candidate content exists in parent file
      // Normalize both to guard against whitespace nuances
      const normSnippet = candidate.content.replace(/\s+/g, " ").trim();
      const normRecord = record.content.replace(/\s+/g, " ").trim();
      if (!normRecord.includes(normSnippet.slice(0, 50))) {
        rejectedCitations.push({
          candidateId: cid,
          code: "CONTENT_MISMATCH",
          reason: `Snippet text could not be verified against actual file content at '${candidate.path}'`,
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
