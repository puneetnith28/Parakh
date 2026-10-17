import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SerpApiClient } from "./client.js";

describe("SerpApiClient", () => {
  it("reports unconfigured when no API key is provided", () => {
    const client = new SerpApiClient("");
    assert.equal(client.isConfigured(), false);
  });

  it("gracefully returns empty array when unconfigured", async () => {
    const client = new SerpApiClient("");
    const results = await client.searchDocumentation("fastify");
    assert.deepEqual(results, []);
  });

  it("enforces strict non-candidate evidence labeling invariant", async () => {
    const client = new SerpApiClient("mock-api-key");
    assert.equal(client.isConfigured(), true);

    // Mock global fetch
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({
          organic_results: [
            {
              title: "Fastify Documentation",
              link: "https://fastify.dev/docs/latest/",
              snippet: "Fastify is a web framework highly focused on providing the best developer experience.",
            },
          ],
        }),
      } as any;
    };

    try {
      const results = await client.searchDocumentation("fastify");
      assert.equal(results.length, 1);
      assert.equal(results[0].title, "Fastify Documentation");
      assert.equal(results[0].link, "https://fastify.dev/docs/latest/");
      assert.equal(results[0].sourceType, "external_reference_context");
      assert.equal(results[0].isCandidateEvidence, false);
      assert.ok(results[0].timestamp);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("handles fetch errors gracefully without crashing caller", async () => {
    const client = new SerpApiClient("mock-api-key");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("Network timeout or connection refused");
    };

    try {
      const results = await client.searchDocumentation("react-query");
      assert.deepEqual(results, []);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
