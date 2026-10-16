import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  cosineSimilarity,
  DeterministicHashEmbeddingProvider,
  SemanticRetriever,
} from "./semantic.js";
import type { EvidenceRecord, Requirement } from "@parakh/contracts";

describe("Semantic Embedding Retrieval Adapter", () => {
  test("computes cosine similarity accurately", () => {
    // Identical unit vectors -> 1.0
    const vec1 = [1, 0, 0];
    const vec2 = [1, 0, 0];
    assert.equal(cosineSimilarity(vec1, vec2), 1.0);

    // Orthogonal vectors -> 0.0
    const vec3 = [0, 1, 0];
    assert.equal(cosineSimilarity(vec1, vec3), 0.0);

    // Opposite vectors -> -1.0
    const vec4 = [-1, 0, 0];
    assert.equal(cosineSimilarity(vec1, vec4), -1.0);
  });

  test("deterministic embedding provider generates normalized vectors", async () => {
    const provider = new DeterministicHashEmbeddingProvider(16);
    const v1 = await provider.embedText("authentication");
    const v2 = await provider.embedText("authentication");
    const v3 = await provider.embedText("database");

    assert.equal(v1.length, 16);
    // Deterministic: same text gives same vector
    assert.deepEqual(v1, v2);

    // Similarity of identical text should be 1.0
    assert.equal(cosineSimilarity(v1, v2), 1.0);

    // Different texts have distinct vectors
    assert.notDeepEqual(v1, v3);
  });

  test("retrieves and ranks candidate chunks using semantic embeddings", async () => {
    const provider = new DeterministicHashEmbeddingProvider(32);
    const retriever = new SemanticRetriever(provider);

    const requirement: Requirement = {
      id: "req_auth",
      text: "User authentication token verification",
      category: "backend",
      priority: "mandatory",
    };

    const records: EvidenceRecord[] = [
      {
        id: "ev_auth",
        repository: "org/repo",
        commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
        path: "src/auth.ts",
        canonicalUrl: "https://github.com/org/repo/blob/4f738b55239a031a0e4c6c0e816a2d1f4d924cb5/src/auth.ts",
        fileType: "source",
        lineCount: 20,
        content: "export function verifyUserToken(token: string) { return true; }",
        ingestionStatus: "full",
      },
      {
        id: "ev_css",
        repository: "org/repo",
        commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
        path: "styles/theme.css",
        canonicalUrl: "https://github.com/org/repo/blob/4f738b55239a031a0e4c6c0e816a2d1f4d924cb5/styles/theme.css",
        fileType: "source",
        lineCount: 10,
        content: ".button { color: blue; }",
        ingestionStatus: "full",
      },
    ];

    const result = await retriever.retrieveEvidence(
      requirement,
      {
        repository: "org/repo",
        commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
        records,
        totalFiles: 2,
        indexedAt: new Date().toISOString(),
      },
      { topK: 2, minRelevanceScore: 0.0 }
    );

    assert.equal(result.requirementId, "req_auth");
    assert.equal(result.strategyUsed, "semantic");
    assert.ok(result.candidates.length > 0);
    // auth.ts chunk should be top match
    assert.equal(result.candidates[0].candidate.path, "src/auth.ts");
  });
});
