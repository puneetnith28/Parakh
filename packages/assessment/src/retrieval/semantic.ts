/**
 * Fast, deterministic 32-bit FNV-1a hash for token projection without node:crypto dependency.
 */
function fnv1a32(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

import type { Requirement } from "@parakh/contracts";
import type {
  IEvidenceRetriever,
  RepositoryIndex,
  RetrievalOptions,
  RetrievalResult,
  ScoredCandidate,
} from "./interface.js";
import { chunkEvidenceRecord, type CodeChunk } from "./chunker.js";
import { applySourceTypeWeight } from "./ranker.js";
import { tokenizeText } from "./lexical.js";

/**
 * Semantic Embedding Retrieval Adapter.
 *
 * Provides dense vector similarity search across chunked code snippets
 * using cosine similarity, bridging conceptual synonyms between requirements
 * and code (e.g., "authentication" matching "verifyUserToken").
 */

export interface IEmbeddingProvider {
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

/**
 * Compute cosine similarity between two numeric vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return Number((dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))).toFixed(4));
}

/**
 * Deterministic hash-based embedding provider for standalone test & offline environments.
 * Generates normalized 32-dimensional dense vectors based on sub-token semantic hashes.
 */
export class DeterministicHashEmbeddingProvider implements IEmbeddingProvider {
  constructor(private readonly dimensions = 64) {}

  async embedText(text: string): Promise<number[]> {
    const vector = new Array<number>(this.dimensions).fill(0);
    const tokens = tokenizeText(text);

    if (tokens.length === 0) {
      return vector;
    }

    for (const token of tokens) {
      const idx = fnv1a32(token) % this.dimensions;
      vector[idx] += 1.0;
    }

    // Normalize vector to unit length
    let norm = 0;
    for (const val of vector) {
      norm += val * val;
    }
    const magnitude = Math.sqrt(norm);
    if (magnitude > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] = vector[i] / magnitude;
      }
    }

    return vector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embedText(t)));
  }
}

export class SemanticRetriever implements IEvidenceRetriever {
  readonly strategyName = "semantic" as const;

  constructor(private readonly embeddingProvider: IEmbeddingProvider) {}

  async retrieveEvidence(
    requirement: Requirement,
    repositoryIndex: RepositoryIndex,
    options: RetrievalOptions = {}
  ): Promise<RetrievalResult> {
    const startTime = Date.now();
    const topK = options.topK ?? 5;
    const minScore = options.minRelevanceScore ?? 0.1;

    // 1. Chunk all eligible records in repository
    const allChunks: CodeChunk[] = [];
    for (const record of repositoryIndex.records) {
      const chunks = chunkEvidenceRecord(record);
      allChunks.push(...chunks);
    }

    if (allChunks.length === 0) {
      return {
        requirementId: requirement.id,
        candidates: [],
        strategyUsed: this.strategyName,
        totalEvaluated: 0,
        latencyMs: Date.now() - startTime,
      };
    }

    // 2. Embed requirement query
    const queryText = `${requirement.text} ${requirement.acceptanceCriteria || ""}`.trim();
    const queryVector = await this.embeddingProvider.embedText(queryText);

    // 3. Embed chunks in batch
    const chunkTexts = allChunks.map((c) => `${c.filePath} ${c.enclosingScope || ""} ${c.content}`);
    const chunkVectors = await this.embeddingProvider.embedBatch(chunkTexts);

    // 4. Calculate similarities and apply source-type weighting
    const scoredChunks: Array<{
      chunk: CodeChunk;
      rawSimilarity: number;
      finalScore: number;
    }> = [];

    for (let i = 0; i < allChunks.length; i++) {
      const rawSimilarity = cosineSimilarity(queryVector, chunkVectors[i]);
      const { weightedScore } = applySourceTypeWeight(
        rawSimilarity,
        allChunks[i].fileType,
        options.sourceWeightMultipliers
      );

      if (weightedScore >= minScore) {
        scoredChunks.push({
          chunk: allChunks[i],
          rawSimilarity,
          finalScore: weightedScore,
        });
      }
    }

    // Sort descending by finalScore
    scoredChunks.sort((a, b) => b.finalScore - a.finalScore);
    const topMatches = scoredChunks.slice(0, topK);

    // 5. Build ScoredCandidates
    const candidates: ScoredCandidate[] = topMatches.map((item, idx) => ({
      candidate: {
        candidateId: `cand_sem_${idx + 1}`,
        fileId: item.chunk.fileId,
        path: item.chunk.filePath,
        commitSha: item.chunk.commitSha,
        canonicalUrl: item.chunk.canonicalUrl,
        startLine: item.chunk.startLine,
        endLine: item.chunk.endLine,
        content: item.chunk.content,
        score: item.finalScore,
        fileType: item.chunk.fileType,
      },
      score: item.finalScore,
      matchedTerms: [],
      rationale: `Semantic embedding similarity ${item.rawSimilarity} (weighted: ${item.finalScore})`,
    }));

    return {
      requirementId: requirement.id,
      candidates,
      strategyUsed: this.strategyName,
      totalEvaluated: allChunks.length,
      latencyMs: Date.now() - startTime,
      diagnostics: {
        topFileMatches: topMatches.map((m) => `${m.chunk.filePath}:${m.chunk.startLine} (${m.finalScore})`),
      },
    };
  }
}
