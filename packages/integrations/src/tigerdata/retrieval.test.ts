import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { TigerDataHybridRetriever, type TigerDbQueryClient } from "./retrieval.js";

describe("Tiger Data pgvector Hybrid Retrieval Layer", () => {
  test("returns null when database is not configured (graceful fallback)", async () => {
    const retriever = new TigerDataHybridRetriever({});
    assert.equal(retriever.isConfigured(), false);

    const result = await retriever.searchHybrid({
      repository: "org/repo",
      commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
      queryText: "PostgreSQL full text search",
    });

    assert.equal(result, null, "Should return null to signal fallback to local retrieval");
  });

  test("executes hybrid query and converts rows to CandidateSnippets when client configured", async () => {
    const mockClient: TigerDbQueryClient = {
      async query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
        assert.ok(sql.includes("plainto_tsquery"));
        assert.ok(sql.includes("vector"));
        assert.equal(params?.[0], "facebook/react");
        assert.equal(params?.[1], "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5");

        return {
          rows: [
            {
              id: "chunk_1",
              repository: "facebook/react",
              commit_sha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
              path: "packages/react/src/ReactHooks.js",
              canonical_url: "https://github.com/facebook/react/blob/sha/ReactHooks.js#L1-L30",
              file_type: "source" as const,
              start_line: 1,
              end_line: 30,
              content: "export function useState(initialState) { ... }",
              text_score: 0.85,
              vector_score: 0.92,
            },
          ] as unknown as T[],
        };
      },
    };

    const retriever = new TigerDataHybridRetriever({ client: mockClient });
    assert.equal(retriever.isConfigured(), true);

    const result = await retriever.searchHybrid({
      repository: "facebook/react",
      commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
      queryText: "useState hook implementation",
      queryVector: [0.1, 0.2, 0.3],
      limit: 1,
    });

    assert.ok(result);
    assert.equal(result.length, 1);
    assert.equal(result[0].path, "packages/react/src/ReactHooks.js");
    assert.equal(result[0].fileType, "source");
    assert.ok(result[0].score! > 0.8);
  });
});
