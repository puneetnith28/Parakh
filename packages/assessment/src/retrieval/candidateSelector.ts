import type { Requirement, CandidateSnippet } from "@parakh/contracts";
import type { RepositoryIndex } from "./interface.js";
import { chunkEvidenceRecord } from "./chunker.js";
import { tokenizeText } from "./lexical.js";
import { applySourceTypeWeight } from "./ranker.js";

/**
 * Per-Requirement Candidate Selection Pipeline.
 *
 * For each requirement, discovers, ranks, and bounds candidate evidence snippets
 * to create a focused, high-precision candidate universe with stable ephemeral
 * IDs (e.g. cand_001, cand_002) and strict token budgets (max 2,000 tokens).
 */

export interface CandidateSelectorOptions {
  maxCandidates?: number; // default: 5
  maxTotalTokens?: number; // default: 2,000 (~8,000 characters)
  maxTokensPerSnippet?: number; // default: 450 (~1,800 characters)
  minScoreThreshold?: number; // default: 0.1
}

export interface RequirementCandidateUniverse {
  requirementId: string;
  requirementText: string;
  candidates: CandidateSnippet[];
  totalTokensEstimated: number;
  candidateCount: number;
}

/**
 * Approximate token count from text using 4 characters per token rule.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export class CandidateSelector {
  private readonly maxCandidates: number;
  private readonly maxTotalTokens: number;
  private readonly maxTokensPerSnippet: number;
  private readonly minScoreThreshold: number;

  constructor(options: CandidateSelectorOptions = {}) {
    this.maxCandidates = options.maxCandidates ?? 5;
    this.maxTotalTokens = options.maxTotalTokens ?? 2000;
    this.maxTokensPerSnippet = options.maxTokensPerSnippet ?? 450;
    this.minScoreThreshold = options.minScoreThreshold ?? 0.1;
  }

  /**
   * Select top candidate snippets for a requirement within token and ranking bounds.
   */
  selectCandidates(
    requirement: Requirement,
    repositoryIndex: RepositoryIndex
  ): RequirementCandidateUniverse {
    const query = `${requirement.text} ${requirement.acceptanceCriteria || ""}`.trim();
    const queryTokens = tokenizeText(query);

    // 1. Chunk all records
    const allChunks = repositoryIndex.records.flatMap((r) => chunkEvidenceRecord(r));

    // 2. Score each chunk using token presence + path match + source type weights
    const scored = allChunks.map((chunk) => {
      const pathLower = chunk.filePath.toLowerCase();
      const contentLower = chunk.content.toLowerCase();
      let rawScore = 0;

      for (const token of queryTokens) {
        if (pathLower.includes(token)) {
          rawScore += 3.0;
        }
        let pos = 0;
        let hits = 0;
        while ((pos = contentLower.indexOf(token, pos)) !== -1) {
          hits++;
          pos += token.length;
          if (hits >= 15) break;
        }
        if (hits > 0) {
          rawScore += (hits * 2.0) / (hits + 1.2);
        }
      }

      // Apply source type weighting (test: 1.5x, source: 1.2x, doc: 0.7x)
      const { weightedScore } = applySourceTypeWeight(rawScore, chunk.fileType);

      return {
        chunk,
        rawScore,
        weightedScore,
      };
    });

    // 3. Filter by min score and sort descending
    const filtered = scored
      .filter((s) => s.weightedScore >= this.minScoreThreshold)
      .sort((a, b) => b.weightedScore - a.weightedScore);

    // 4. Select top candidates respecting maxCandidates and maxTotalTokens
    const candidates: CandidateSnippet[] = [];
    let accumulatedTokens = 0;
    let candidateIndex = 1;

    for (const item of filtered) {
      if (candidates.length >= this.maxCandidates) {
        break;
      }

      let content = item.chunk.content;
      let snippetTokens = estimateTokens(content);

      // Truncate individual snippet if it exceeds maxTokensPerSnippet
      if (snippetTokens > this.maxTokensPerSnippet) {
        const charLimit = this.maxTokensPerSnippet * 4;
        content = `${content.slice(0, charLimit)}\n// ... [snippet truncated for context budget]`;
        snippetTokens = estimateTokens(content);
      }

      // Check if adding exceeds total budget
      if (accumulatedTokens + snippetTokens > this.maxTotalTokens && candidates.length > 0) {
        break;
      }

      const candidateId = `cand_${String(candidateIndex).padStart(3, "0")}`;
      candidateIndex++;
      accumulatedTokens += snippetTokens;

      candidates.push({
        candidateId,
        fileId: item.chunk.fileId,
        path: item.chunk.filePath,
        commitSha: item.chunk.commitSha,
        canonicalUrl: item.chunk.canonicalUrl,
        startLine: item.chunk.startLine,
        endLine: item.chunk.endLine,
        content,
        score: item.weightedScore,
        fileType: item.chunk.fileType,
      });
    }

    return {
      requirementId: requirement.id,
      requirementText: requirement.text,
      candidates,
      totalTokensEstimated: accumulatedTokens,
      candidateCount: candidates.length,
    };
  }

  /**
   * Process multiple requirements in batch.
   */
  selectBatch(
    requirements: Requirement[],
    repositoryIndex: RepositoryIndex
  ): RequirementCandidateUniverse[] {
    return requirements.map((req) => this.selectCandidates(req, repositoryIndex));
  }
}
