# Parakh Data Architecture: Ephemeral Retrieval vs. Persistent Storage

This document specifies the architectural separation of concerns between ephemeral retrieval layers and durable persistent storage in Parakh.

---

## 1. Core Principle: Zero Duplication & Disposal Independence

Parakh operates under a strict data minimization and provenance model:

1. **Repository Code is Ephemeral:**
   Source code files downloaded from GitHub are treated exclusively as transient evidence. They are ingested, indexed into ephemeral retrieval structures (in-memory `RepositoryIndex` or Tiger Data / PostgreSQL `evidence_chunks`), and can be purged at any time without compromising past audit results.
2. **Reports are Durable:**
   Final capability assessment reports, requirements, compliance statuses, audit trails, and citation links are persisted durably in **MongoDB Atlas**.
3. **Verified Permalinks Over Clones:**
   Instead of storing entire repository snapshots permanently, Parakh pins immutable 40-character Git commit SHAs (`https://github.com/{owner}/{repo}/blob/{sha}/{path}#L{start}-L{end}`). The permanent record stores only the pinned citation metadata, verified snippet text, and permalink.

---

## 2. Layer Delineation

| Architectural Layer | Store Technology | Lifecycle & TTL | Owned Entities |
| :--- | :--- | :--- | :--- |
| **Ephemeral Retrieval Cache** | In-Memory (`IndexManager`) / Tiger Data (`pgvector`) | Transient (1 hour default TTL, cache evictable) | `RepositoryIndex`, `CodeChunk`, token indexes, dense vector embeddings |
| **Primary Durable Storage** | MongoDB Atlas | Permanent (Retention policy / user deletion) | `Opportunity`, `Requirement`, `AssessmentReport`, `AuditRun`, User Accounts |
| **Source Authority** | Public GitHub REST/Git Data API | External Immutable Ref | Public commit trees, immutable Git blobs |

---

## 3. Ephemeral Cache Eviction Invariant

If the ephemeral retrieval index (`IndexManager`) is flushed or crashes:
- **No data loss occurs:** All completed `AssessmentReport` documents in MongoDB Atlas retain full citations, explanations, and exact line-range permalinks.
- **Repeat analysis on demand:** Any subsequent run against the same `(owner, repo, commitSha)` simply re-fetches and re-indexes on demand through the bounded GitHub ingestion pipeline.

---

## 4. Verification Check

```typescript
import { IndexManager } from "@parakh/assessment";

const manager = new IndexManager({ ttlMs: 3600000, maxActiveIndexes: 20 });
// createIndex(...) -> ephemeral
// purgeAll() -> clears in-memory structures without touching persistent database
```
