import type { Requirement } from "@parakh/contracts";
import type {
  IEvidenceRetriever,
  RepositoryIndex,
  RetrievalOptions,
  RetrievalResult,
  ScoredCandidate,
} from "./interface.js";
import { tokenizeText } from "./lexical.js";
import { chunkEvidenceRecord } from "./chunker.js";
import { applySourceTypeWeight } from "./ranker.js";
import {
  DeterministicHashEmbeddingProvider,
  cosineSimilarity,
  type IEmbeddingProvider,
} from "./semantic.js";
import type { RequirementCandidateUniverse } from "./candidateSelector.js";

export interface SymbolMatch {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "route" | "test" | "variable";
  line: number;
}

/**
 * Lightweight AST/symbol extractor for common languages (TypeScript, JavaScript, Python, Go, Java).
 */
export function extractCodeSymbols(content: string): SymbolMatch[] {
  const symbols: SymbolMatch[] = [];
  const lines = content.split("\n");

  const patterns: Array<{ regex: RegExp; kind: SymbolMatch["kind"] }> = [
    { regex: /(?:function|async\s+function)\s+([a-zA-Z0-9_$]+)/, kind: "function" },
    { regex: /(?:class)\s+([a-zA-Z0-9_$]+)/, kind: "class" },
    { regex: /(?:interface)\s+([a-zA-Z0-9_$]+)/, kind: "interface" },
    { regex: /(?:type)\s+([a-zA-Z0-9_$]+)\s*=/, kind: "type" },
    { regex: /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(/, kind: "function" },
    { regex: /(?:router|app)\.(?:get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/, kind: "route" },
    { regex: /(?:test|it|describe)\s*\(\s*["']([^"']+)["']/, kind: "test" },
    { regex: /(?:def)\s+([a-zA-Z0-9_]+)/, kind: "function" },
    { regex: /(?:func)\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_]+)/, kind: "function" },
  ];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (const { regex, kind } of patterns) {
      const match = line.match(regex);
      if (match && match[1]) {
        symbols.push({
          name: match[1],
          kind,
          line: lineIdx + 1,
        });
      }
    }
  }

  return symbols;
}

export interface UnifiedRetrieverOptions extends RetrievalOptions {
  embeddingProvider?: IEmbeddingProvider;
  enableSymbols?: boolean;
  enableSemantic?: boolean;
}

export class UnifiedEvidenceRetriever implements IEvidenceRetriever {
  readonly strategyName = "hybrid" as const;
  private readonly embeddingProvider: IEmbeddingProvider;
  private readonly enableSymbols: boolean;
  private readonly enableSemantic: boolean;

  constructor(options: UnifiedRetrieverOptions = {}) {
    this.embeddingProvider = options.embeddingProvider || new DeterministicHashEmbeddingProvider(64);
    this.enableSymbols = options.enableSymbols ?? true;
    this.enableSemantic = options.enableSemantic ?? true;
  }

  /**
   * Retrieves, ranks, and bounds candidate snippets for a single requirement.
   */
  async retrieveEvidence(
    requirement: Requirement,
    repositoryIndex: RepositoryIndex,
    options: RetrievalOptions = {}
  ): Promise<RetrievalResult> {
    const startTime = Date.now();
    const topK = options.topK ?? 5;
    const minScore = options.minRelevanceScore ?? 0.05;

    const queryText = `${requirement.text} ${requirement.acceptanceCriteria || ""}`.trim();
    const queryTokens = tokenizeText(queryText);

    // 1. Chunk all records
    const allChunks = repositoryIndex.records.flatMap((r) => chunkEvidenceRecord(r));

    // Pre-calculate query embedding if semantic search is active
    let queryEmbedding: number[] = [];
    if (this.enableSemantic) {
      queryEmbedding = await this.embeddingProvider.embedText(queryText);
    }

    const scoredCandidates: ScoredCandidate[] = [];

    for (const chunk of allChunks) {
      const chunkLower = chunk.content.toLowerCase();
      const pathLower = chunk.filePath.toLowerCase();
      const matchedTerms: string[] = [];

      // A. Lexical Score
      let lexicalScore = 0;
      for (const token of queryTokens) {
        let tokenFound = false;
        if (pathLower.includes(token)) {
          lexicalScore += 3.0;
          tokenFound = true;
        }
        let pos = 0;
        let hits = 0;
        while ((pos = chunkLower.indexOf(token, pos)) !== -1) {
          hits++;
          pos += token.length;
          if (hits >= 15) break;
        }
        if (hits > 0) {
          lexicalScore += (hits * 2.0) / (hits + 1.2);
          tokenFound = true;
        }
        if (tokenFound) {
          matchedTerms.push(token);
        }
      }

      // B. Symbol Match Boost
      let symbolScore = 0;
      if (this.enableSymbols) {
        const symbols = extractCodeSymbols(chunk.content);
        for (const symbol of symbols) {
          const symLower = symbol.name.toLowerCase();
          for (const token of queryTokens) {
            if (symLower.includes(token)) {
              symbolScore += symbol.kind === "test" ? 2.5 : 2.0;
              matchedTerms.push(`${symbol.kind}:${symbol.name}`);
            }
          }
        }
      }

      // C. Semantic Vector Similarity
      let semanticScore = 0;
      if (this.enableSemantic && queryEmbedding.length > 0) {
        const chunkEmbedding = await this.embeddingProvider.embedText(chunk.content.slice(0, 500));
        const sim = cosineSimilarity(queryEmbedding, chunkEmbedding);
        // Normalize cosine [-1..1] to [0..2] score contribution
        if (sim > 0.1) {
          semanticScore = sim * 2.5;
        }
      }

      const rawCombined = lexicalScore + symbolScore + semanticScore;
      if (rawCombined <= 0) continue;

      // D. Apply Source-Type Weighting (test: 1.5x, source: 1.2x, config: 1.0x, doc: 0.7x)
      const { weightedScore, multiplier } = applySourceTypeWeight(rawCombined, chunk.fileType);

      if (weightedScore < minScore) continue;

      const rationale = `Matched [${Array.from(new Set(matchedTerms)).slice(0, 6).join(", ")}] (lexical: ${lexicalScore.toFixed(1)}, symbol: ${symbolScore.toFixed(1)}, semantic: ${semanticScore.toFixed(1)}) x ${multiplier}x (${chunk.fileType})`;

      scoredCandidates.push({
        candidate: {
          candidateId: "temp",
          fileId: chunk.fileId,
          path: chunk.filePath,
          commitSha: chunk.commitSha,
          canonicalUrl: chunk.canonicalUrl,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          content: chunk.content,
          score: weightedScore,
          fileType: chunk.fileType,
        },
        score: weightedScore,
        matchedTerms: Array.from(new Set(matchedTerms)),
        rationale,
      });
    }

    // Sort descending by score
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Bound to topK candidates and assign stable sequential IDs
    const bounded = scoredCandidates.slice(0, topK).map((item, idx) => {
      const candidateId = `cand_${String(idx + 1).padStart(3, "0")}`;
      return {
        ...item,
        candidate: {
          ...item.candidate,
          candidateId,
        },
      };
    });

    return {
      requirementId: requirement.id,
      candidates: bounded,
      strategyUsed: this.strategyName,
      totalEvaluated: allChunks.length,
      latencyMs: Date.now() - startTime,
      diagnostics: {
        termsExtracted: queryTokens,
        topFileMatches: bounded.map((b) => `${b.candidate.path} (${b.score})`),
      },
    };
  }

  /**
   * Retrieves candidate universe directly compatible with CandidateSelector.
   */
  async retrieveUniverse(
    requirement: Requirement,
    repositoryIndex: RepositoryIndex,
    options: RetrievalOptions = {}
  ): Promise<RequirementCandidateUniverse> {
    const result = await this.retrieveEvidence(requirement, repositoryIndex, options);
    const candidates = result.candidates.map((c) => c.candidate);
    const totalChars = candidates.reduce((sum, c) => sum + c.content.length, 0);

    return {
      requirementId: requirement.id,
      requirementText: requirement.text,
      candidates,
      totalTokensEstimated: Math.ceil(totalChars / 4),
      candidateCount: candidates.length,
    };
  }

  /**
   * Batch retrieval for all requirements.
   */
  async retrieveBatch(
    requirements: Requirement[],
    repositoryIndex: RepositoryIndex,
    options: RetrievalOptions = {}
  ): Promise<RequirementCandidateUniverse[]> {
    const universes: RequirementCandidateUniverse[] = [];
    for (const req of requirements) {
      universes.push(await this.retrieveUniverse(req, repositoryIndex, options));
    }
    return universes;
  }
}
