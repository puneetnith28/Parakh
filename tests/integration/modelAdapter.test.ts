import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GemmaModelAdapter } from "../../packages/integrations/src/gemma/adapter.js";
import { GemmaClient } from "../../packages/integrations/src/gemma/client.js";
import { QuotaGuard } from "../../packages/integrations/src/gemma/quotaGuard.js";
import { ModelProviderError } from "../../packages/integrations/src/gemma/types.js";

describe("Integration: Model Adapter Resilience and Fallbacks", () => {
  it("uses mock provider cleanly when unconfigured or requested", async () => {
    const adapter = new GemmaModelAdapter({ provider: "mock" });
    const result = await adapter.generateText("Assess Fastify capability");

    assert.equal(result.provider, "mock");
    assert.equal(result.isMock, true);
    assert.equal(result.model, "mock-evaluator");
    assert.ok(typeof result.latencyMs === "number");
    const parsed = JSON.parse(result.text);
    assert.equal(parsed.status, "demonstrated");
  });

  it("transparently returns isMock: true and mock-extractor model for requirement extraction prompts", async () => {
    const adapter = new GemmaModelAdapter({ provider: "mock" });
    const result = await adapter.generateText("<opportunity_brief>Build a React app</opportunity_brief>");

    assert.equal(result.provider, "mock");
    assert.equal(result.isMock, true);
    assert.equal(result.model, "mock-extractor");
    const parsed = JSON.parse(result.text);
    assert.ok(Array.isArray(parsed.requirements));
  });

  it("enforces timeout boundaries and throws normalized ModelProviderError on hang", async () => {
    // Custom fetch simulating infinite hang
    const hangingFetch: typeof fetch = async (_url, options) => {
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    };

    const adapter = new GemmaModelAdapter({
      provider: "google-ai",
      apiKey: "dummy-key",
      fetchFn: hangingFetch,
    });

    await assert.rejects(
      async () => {
        await adapter.generateText("Analyze code", { timeoutMs: 50 });
      },
      (err: any) => {
        assert.ok(err instanceof ModelProviderError);
        assert.equal(err.isRetryable, true);
        assert.equal(err.statusCode, 504);
        assert.ok(err.message.includes("timed out after 50ms"));
        return true;
      }
    );
  });

  it("handles model refusal and unauthorized 401 without unhandled promise rejection", async () => {
    const unauthorizedFetch: typeof fetch = async () => {
      return {
        ok: false,
        status: 401,
        headers: new Headers(),
        text: async () => JSON.stringify({ error: { message: "API_KEY_INVALID" } }),
      } as any;
    };

    const adapter = new GemmaModelAdapter({
      provider: "google-ai",
      apiKey: "invalid-key",
      fetchFn: unauthorizedFetch,
    });

    await assert.rejects(
      async () => {
        await adapter.generateText("Evaluate repo");
      },
      (err: any) => {
        assert.ok(err instanceof ModelProviderError);
        assert.equal(err.statusCode, 401);
        assert.ok(err.message.includes("401") || err.message.includes("API_KEY_INVALID"));
        return true;
      }
    );
  });

  it("QuotaGuard computes exponential backoff on 429 and terminates after maxRetries", () => {
    const guard = new QuotaGuard({ maxRetries: 3 });

    const attempt0 = guard.handleRateLimit(429, 0);
    assert.equal(attempt0.canRetry, true);
    assert.ok(attempt0.backoffMs >= 1500);

    const attempt1 = guard.handleRateLimit(429, 1);
    assert.equal(attempt1.canRetry, true);
    assert.ok(attempt1.backoffMs >= 3000);

    const attempt3 = guard.handleRateLimit(429, 3);
    assert.equal(attempt3.canRetry, false);
    assert.equal(attempt3.backoffMs, 0);
    assert.ok(attempt3.advisory.includes("quota exceeded"));
  });

  it("GemmaClient clamps temperature strictly to conservative range [0.0, 0.2]", () => {
    const clientHigh = new GemmaClient({ temperature: 0.9 });
    assert.equal(clientHigh.temperature, 0.2);

    const clientLow = new GemmaClient({ temperature: -0.5 });
    assert.equal(clientLow.temperature, 0.0);

    const clientNormal = new GemmaClient({ temperature: 0.15 });
    assert.equal(clientNormal.temperature, 0.15);
  });
});
