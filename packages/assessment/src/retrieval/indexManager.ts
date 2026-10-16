import type { EvidenceRecord } from "@parakh/contracts";
import type { RepositoryIndex } from "./interface.js";

/**
 * Ephemeral Retrieval Index Manager.
 *
 * Implements strict separation between transient retrieval caches (in-memory / Tiger Data)
 * and durable application state (MongoDB Atlas).
 *
 * Enforces TTL-based automatic eviction and memory bounds so that ephemeral
 * repository indexes can be wiped at any time without losing persistent assessment reports.
 */

export interface IndexManagerOptions {
  ttlMs?: number; // default: 1 hour (3,600,000 ms)
  maxActiveIndexes?: number; // default: 20 repositories
}

interface CachedIndexEntry {
  index: RepositoryIndex;
  createdAtMs: number;
  lastAccessedMs: number;
}

export class IndexManager {
  private readonly ttlMs: number;
  private readonly maxActiveIndexes: number;
  private readonly cache = new Map<string, CachedIndexEntry>();

  constructor(options: IndexManagerOptions = {}) {
    this.ttlMs = options.ttlMs ?? 60 * 60 * 1000;
    this.maxActiveIndexes = options.maxActiveIndexes ?? 20;
  }

  private buildKey(repository: string, commitSha: string): string {
    return `${repository.toLowerCase()}@${commitSha.toLowerCase()}`;
  }

  /**
   * Register and index repository evidence records in the ephemeral cache.
   */
  createIndex(repository: string, commitSha: string, records: EvidenceRecord[]): RepositoryIndex {
    this.cleanupExpired();

    const key = this.buildKey(repository, commitSha);

    // If key already exists, delete it so re-insert moves to most recent position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxActiveIndexes) {
      // Evict oldest (first key in insertion order)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const index: RepositoryIndex = {
      repository,
      commitSha: commitSha.toLowerCase(),
      records,
      totalFiles: records.length,
      indexedAt: new Date().toISOString(),
    };

    const now = Date.now();
    this.cache.set(key, {
      index,
      createdAtMs: now,
      lastAccessedMs: now,
    });

    return index;
  }

  /**
   * Retrieve an active ephemeral index if still valid and not expired.
   */
  getIndex(repository: string, commitSha: string): RepositoryIndex | null {
    const key = this.buildKey(repository, commitSha);
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.createdAtMs > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position to most recently used in Map order
    entry.lastAccessedMs = Date.now();
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.index;
  }

  /**
   * Explicitly evict a repository index from the cache.
   */
  evictIndex(repository: string, commitSha: string): boolean {
    const key = this.buildKey(repository, commitSha);
    return this.cache.delete(key);
  }

  /**
   * Purge all ephemeral repository indexes immediately.
   */
  purgeAll(): void {
    this.cache.clear();
  }

  /**
   * Internal sweep of expired TTL entries.
   */
  cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.createdAtMs > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Telemetry and cache diagnostics.
   */
  getDiagnostics(): {
    activeIndexesCount: number;
    totalFilesIndexed: number;
    estimatedMemoryBytes: number;
  } {
    let totalFiles = 0;
    let estimatedBytes = 0;

    for (const entry of this.cache.values()) {
      totalFiles += entry.index.totalFiles;
      for (const record of entry.index.records) {
        estimatedBytes += record.content.length * 2; // rough UTF-16 in-memory size
      }
    }

    return {
      activeIndexesCount: this.cache.size,
      totalFilesIndexed: totalFiles,
      estimatedMemoryBytes: estimatedBytes,
    };
  }
}
