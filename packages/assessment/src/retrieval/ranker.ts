import type { FileType } from "@parakh/contracts";
import type { ScoredCandidate } from "./interface.js";
import type { LexicalMatch } from "./lexical.js";

/**
 * Source-Type Weighting and Evidence Ranking Heuristics.
 *
 * Implements deterministic weight multipliers based on verifiable evidence strength:
 * - test:   1.5x (demonstrates working behavior through automated verification)
 * - source: 1.2x (actual implementation code)
 * - config: 1.0x (infrastructure, manifests, and build configuration)
 * - doc:    0.7x (README / documentation claims - treated as unverified claims)
 */

export const DEFAULT_SOURCE_WEIGHTS: Record<FileType, number> = {
  test: 1.5,
  source: 1.2,
  config: 1.0,
  doc: 0.7,
};

export interface RankerOptions {
  weights?: Partial<Record<FileType, number>>;
  preferRecentCommit?: boolean;
}

export function getSourceWeight(fileType: FileType, customWeights?: Partial<Record<FileType, number>>): number {
  if (customWeights && typeof customWeights[fileType] === "number") {
    return customWeights[fileType]!;
  }
  return DEFAULT_SOURCE_WEIGHTS[fileType] ?? 1.0;
}

export function applySourceTypeWeight(
  baseScore: number,
  fileType: FileType,
  customWeights?: Partial<Record<FileType, number>>
): { weightedScore: number; multiplier: number } {
  const multiplier = getSourceWeight(fileType, customWeights);
  const weightedScore = Number((baseScore * multiplier).toFixed(3));
  return { weightedScore, multiplier };
}

export class EvidenceRanker {
  private readonly weights: Record<FileType, number>;

  constructor(options: RankerOptions = {}) {
    this.weights = {
      ...DEFAULT_SOURCE_WEIGHTS,
      ...(options.weights || {}),
    };
  }

  /**
   * Re-rank raw lexical matches applying source-type weights.
   */
  rankLexicalMatches(matches: LexicalMatch[]): Array<LexicalMatch & { weightedScore: number; multiplier: number }> {
    const scored = matches.map((match) => {
      const { weightedScore, multiplier } = applySourceTypeWeight(
        match.score,
        match.record.fileType,
        this.weights
      );
      return {
        ...match,
        weightedScore,
        multiplier,
      };
    });

    return scored.sort((a, b) => b.weightedScore - a.weightedScore);
  }

  /**
   * Re-rank ScoredCandidates applying source-type weights and updating rationale.
   */
  rankCandidates(candidates: ScoredCandidate[]): ScoredCandidate[] {
    const reweighted = candidates.map((item) => {
      const { weightedScore, multiplier } = applySourceTypeWeight(
        item.score,
        item.candidate.fileType,
        this.weights
      );

      const typeLabel = item.candidate.fileType;
      const updatedRationale = `${item.rationale} [Weighted: ${multiplier}x (${typeLabel} evidence)]`;

      return {
        ...item,
        score: weightedScore,
        candidate: {
          ...item.candidate,
          score: weightedScore,
        },
        rationale: updatedRationale,
      };
    });

    return reweighted.sort((a, b) => b.score - a.score);
  }
}
