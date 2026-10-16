import type { Requirement, EvidenceRecord } from "@parakh/contracts";
import type {
  IEvidenceRetriever,
  RepositoryIndex,
  RetrievalOptions,
  RetrievalResult,
  ScoredCandidate,
} from "./interface.js";

/**
 * Fast In-Memory Lexical & Keyword Retrieval Engine.
 *
 * Implements tokenized BM25/TF-IDF inspired term matching across
 * repository file paths, identifiers, and body text.
 */

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "when", "at", "by", "for",
  "with", "about", "against", "between", "into", "through", "during", "before", "after",
  "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under",
  "again", "further", "then", "once", "here", "there", "all", "any", "both", "each", "few",
  "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so",
  "than", "too", "very", "can", "will", "just", "should", "now", "must", "support", "using",
  "implement", "implementation", "create", "provide", "feature", "system", "code", "requirement",
]);

/**
 * Tokenize technical natural language text and code identifiers.
 * Handles camelCase, PascalCase, snake_case, kebab-case.
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];

  // Extract raw whitespace-separated chunks first
  const rawWords = text.split(/\s+/);
  const tokenSet = new Set<string>();

  for (const raw of rawWords) {
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9_.-]/g, "");
    if (cleaned.length >= 2 && !STOP_WORDS.has(cleaned)) {
      tokenSet.add(cleaned);
      // Also add without dots/hyphens/underscores if compound
      const stripped = cleaned.replace(/[_.-]/g, "");
      if (stripped.length >= 2 && !STOP_WORDS.has(stripped)) {
        tokenSet.add(stripped);
      }
    }

    // Split on camelCase boundaries (e.g., "OAuthProvider" -> "OAuth Provider", "PostgreSQL" -> "Postgre SQL")
    const splitCamel = raw.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
    const subWords = splitCamel
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, " ")
      .split(/\s+/);

    for (const sub of subWords) {
      const parts = sub.split(/[_\-.]/);
      for (const part of parts) {
        const clean = part.trim();
        if (clean.length >= 2 && !STOP_WORDS.has(clean)) {
          tokenSet.add(clean);
        }
      }
    }
  }

  return Array.from(tokenSet);
}

export interface LexicalMatch {
  record: EvidenceRecord;
  score: number;
  matchedTerms: string[];
}

export class LexicalRetriever implements IEvidenceRetriever {
  readonly strategyName = "lexical" as const;

  /**
   * Search repository evidence records using tokenized lexical matching.
   */
  searchRecords(queryText: string, records: EvidenceRecord[]): LexicalMatch[] {
    const queryTokens = tokenizeText(queryText);
    if (queryTokens.length === 0 || records.length === 0) {
      return [];
    }

    const matches: LexicalMatch[] = [];

    for (const record of records) {
      const pathLower = record.path.toLowerCase();
      const contentLower = record.content.toLowerCase();

      let score = 0;
      const matchedTerms: string[] = [];

      for (const token of queryTokens) {
        let tokenMatched = false;

        // 1. Path match bonus (file name / directory matching is high signal)
        if (pathLower.includes(token)) {
          score += 3.0;
          tokenMatched = true;
        }

        // 2. Exact word boundaries in content
        // Simple fast substring count
        let count = 0;
        let pos = 0;
        while ((pos = contentLower.indexOf(token, pos)) !== -1) {
          count++;
          pos += token.length;
          if (count >= 20) break; // cap per token to avoid runaway score on repetitive loops
        }

        if (count > 0) {
          tokenMatched = true;
          // BM25-style saturation: term frequency / (term frequency + 1.2)
          const tf = (count * 2.2) / (count + 1.2);
          score += tf;
        }

        if (tokenMatched) {
          matchedTerms.push(token);
        }
      }

      if (score > 0) {
        // Document length normalization to prevent giant files from dominating solely on size
        const docLengthFactor = Math.log(Math.max(10, record.content.length)) / Math.log(1000);
        const normalizedScore = score / Math.max(1, docLengthFactor);

        matches.push({
          record,
          score: Number(normalizedScore.toFixed(3)),
          matchedTerms,
        });
      }
    }

    // Sort descending by score
    matches.sort((a, b) => b.score - a.score);
    return matches;
  }

  /**
   * Implements IEvidenceRetriever
   */
  async retrieveEvidence(
    requirement: Requirement,
    repositoryIndex: RepositoryIndex,
    options: RetrievalOptions = {}
  ): Promise<RetrievalResult> {
    const startTime = Date.now();
    const query = `${requirement.text} ${requirement.acceptanceCriteria || ""}`;
    const matches = this.searchRecords(query, repositoryIndex.records);

    const topK = options.topK ?? 5;
    const minScore = options.minRelevanceScore ?? 0.05;

    const filtered = matches.filter((m) => m.score >= minScore).slice(0, topK);

    const candidates: ScoredCandidate[] = filtered.map((match, idx) => ({
      candidate: {
        candidateId: `cand_lex_${idx + 1}`,
        fileId: match.record.id,
        path: match.record.path,
        commitSha: match.record.commitSha,
        canonicalUrl: match.record.canonicalUrl,
        startLine: 1,
        endLine: Math.min(match.record.lineCount, 60),
        content: match.record.content.split("\n").slice(0, 60).join("\n"),
        score: match.score,
        fileType: match.record.fileType,
      },
      score: match.score,
      matchedTerms: match.matchedTerms,
      rationale: `Lexical term match for [${match.matchedTerms.join(", ")}] with score ${match.score}`,
    }));

    return {
      requirementId: requirement.id,
      candidates,
      strategyUsed: this.strategyName,
      totalEvaluated: repositoryIndex.records.length,
      latencyMs: Date.now() - startTime,
      diagnostics: {
        termsExtracted: tokenizeText(query),
        topFileMatches: filtered.map((f) => `${f.record.path} (${f.score})`),
      },
    };
  }
}
