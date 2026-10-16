import type { CandidateSnippet, FileType } from "@parakh/contracts";

/**
 * Tiger Data / PostgreSQL with pgvector Hybrid Retrieval Layer.
 *
 * Implements hybrid vector and full-text search across large evidence corpora.
 * Connects when TIGERDATA_DATABASE_URL is provided, and gracefully falls back
 * to local in-memory retrieval when unconfigured.
 */

export interface TigerDataRecord {
  id: string;
  repository: string;
  commit_sha: string;
  path: string;
  canonical_url: string;
  file_type: FileType;
  start_line: number;
  end_line: number;
  content: string;
  vector_score?: number;
  text_score?: number;
  hybrid_score?: number;
}

export interface TigerDbQueryClient {
  query: <T = unknown>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>;
}

export interface TigerDataRetrieverOptions {
  databaseUrl?: string;
  client?: TigerDbQueryClient;
}

export class TigerDataHybridRetriever {
  private readonly databaseUrl?: string;
  private readonly client?: TigerDbQueryClient;

  constructor(options: TigerDataRetrieverOptions = {}) {
    this.databaseUrl = options.databaseUrl || process.env.TIGERDATA_DATABASE_URL;
    this.client = options.client;
  }

  /**
   * Determine if Tiger Data connection is configured and available.
   */
  isConfigured(): boolean {
    return Boolean(this.client || (this.databaseUrl && this.databaseUrl.trim().length > 0));
  }

  /**
   * Perform hybrid vector and full-text search across indexed chunks.
   * Returns null if unconfigured to trigger graceful fallback to local retrieval.
   */
  async searchHybrid(params: {
    repository: string;
    commitSha: string;
    queryText: string;
    queryVector?: number[];
    limit?: number;
  }): Promise<CandidateSnippet[] | null> {
    if (!this.isConfigured() || !this.client) {
      // Gracefully signal to caller to use local in-memory retrieval
      return null;
    }

    const { repository, commitSha, queryText, queryVector, limit = 5 } = params;

    const sql = `
      SELECT 
        id, repository, commit_sha, path, canonical_url, file_type, start_line, end_line, content,
        ts_rank(tsv, plainto_tsquery('english', $3)) as text_score,
        CASE WHEN $4::text IS NOT NULL THEN (1 - (embedding <=> $4::vector)) ELSE 0 END as vector_score
      FROM evidence_chunks
      WHERE repository = $1 AND commit_sha = $2
      ORDER BY (
        ts_rank(tsv, plainto_tsquery('english', $3)) * 0.4 +
        CASE WHEN $4::text IS NOT NULL THEN (1 - (embedding <=> $4::vector)) * 0.6 ELSE 0 END
      ) DESC
      LIMIT $5;
    `;

    const vectorStr = queryVector ? `[${queryVector.join(",")}]` : null;
    const result = await this.client.query<TigerDataRecord>(sql, [
      repository,
      commitSha,
      queryText,
      vectorStr,
      limit,
    ]);

    return result.rows.map((row) => ({
      candidateId: `cand_tiger_${row.id}`,
      fileId: row.id,
      path: row.path,
      commitSha: row.commit_sha,
      canonicalUrl: row.canonical_url,
      startLine: row.start_line,
      endLine: row.end_line,
      content: row.content,
      score: Number(((row.text_score || 0) * 0.4 + (row.vector_score || 0) * 0.6).toFixed(3)),
      fileType: row.file_type,
    }));
  }
}
