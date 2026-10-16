import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { IndexManager } from "./indexManager.js";
import type { EvidenceRecord } from "@parakh/contracts";

describe("Ephemeral Retrieval Index Manager", () => {
  const mockRecord: EvidenceRecord = {
    id: "ev_1",
    repository: "org/repo",
    commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
    path: "src/index.ts",
    canonicalUrl: "https://github.com/org/repo/blob/sha/src/index.ts",
    fileType: "source",
    lineCount: 20,
    content: "export const x = 1;",
    ingestionStatus: "full",
  };

  test("creates, accesses, and evicts ephemeral repository indexes", () => {
    const manager = new IndexManager({ ttlMs: 10000, maxActiveIndexes: 5 });

    const index = manager.createIndex("org/repo", "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5", [mockRecord]);
    assert.equal(index.totalFiles, 1);

    const retrieved = manager.getIndex("org/repo", "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5");
    assert.ok(retrieved);
    assert.equal(retrieved.repository, "org/repo");

    const evicted = manager.evictIndex("org/repo", "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5");
    assert.equal(evicted, true);
    assert.equal(manager.getIndex("org/repo", "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5"), null);
  });

  test("evicts oldest index when capacity limit is reached", () => {
    const manager = new IndexManager({ maxActiveIndexes: 2 });

    manager.createIndex("repo1", "sha1", [mockRecord]);
    manager.createIndex("repo2", "sha2", [mockRecord]);
    assert.ok(manager.getIndex("repo1", "sha1"));

    // Adding 3rd should evict repo2 because repo1 was just accessed
    manager.createIndex("repo3", "sha3", [mockRecord]);

    assert.ok(manager.getIndex("repo1", "sha1"), "Recently accessed repo1 should remain");
    assert.ok(manager.getIndex("repo3", "sha3"), "Newly created repo3 should remain");
    assert.equal(manager.getIndex("repo2", "sha2"), null, "Least recently accessed repo2 should be evicted");
  });

  test("purgeAll completely resets all ephemeral state", () => {
    const manager = new IndexManager();
    manager.createIndex("repo1", "sha1", [mockRecord]);
    manager.createIndex("repo2", "sha2", [mockRecord]);

    manager.purgeAll();
    assert.equal(manager.getDiagnostics().activeIndexesCount, 0);
  });
});
