import type { Requirement, EvidenceRecord, CandidateSnippet } from "@parakh/contracts";

/**
 * Unified Retrieval Interface & Contracts.
 *
 * Defines the contract for indexing and querying candidate evidence snippets
 * across multiple search strategies (lexical, semantic, and hybrid).
 */

export interface RepositoryIndex {
  repository: string;
  commitSha: string;
  records: EvidenceRecord[];
  totalFiles: number;
  indexedAt: string;
}

export interface RetrievalOptions {
  topK?: number; // default: 5 candidate snippets per requirement
  maxTokensPerSnippet?: number; // default: 400 tokens / ~1600 chars
  minRelevanceScore?: number; // default: 0.05
  sourceWeightMultipliers?: {
    test?: number;
    source?: number;
    config?: number;
    doc?: number;
  };
}

export interface ScoredCandidate {
  candidate: CandidateSnippet;
  score: number;
  matchedTerms: string[];
  rationale: string;
}

export interface RetrievalResult {
  requirementId: string;
  candidates: ScoredCandidate[];
  strategyUsed: "lexical" | "semantic" | "hybrid";
  totalEvaluated: number;
  latencyMs: number;
  diagnostics?: {
    termsExtracted?: string[];
    topFileMatches?: string[];
  };
}

export interface IEvidenceRetriever {
  readonly strategyName: "lexical" | "semantic" | "hybrid";
  retrieveEvidence(
    requirement: Requirement,
    repositoryIndex: RepositoryIndex,
    options?: RetrievalOptions
  ): Promise<RetrievalResult>;
}
