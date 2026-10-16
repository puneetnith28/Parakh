-- Tiger Data / PostgreSQL with pgvector Schema for Parakh Evidence Chunks

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS evidence_chunks (
  id VARCHAR(64) PRIMARY KEY,
  repository VARCHAR(255) NOT NULL,
  commit_sha CHAR(40) NOT NULL,
  path TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  file_type VARCHAR(32) NOT NULL,
  start_line INT NOT NULL,
  end_line INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(64),
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', path || ' ' || content)) STORED
);

CREATE INDEX IF NOT EXISTS idx_evidence_repo_sha ON evidence_chunks(repository, commit_sha);
CREATE INDEX IF NOT EXISTS idx_evidence_tsv ON evidence_chunks USING GIN(tsv);
