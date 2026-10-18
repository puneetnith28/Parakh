import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GemmaModelAdapter } from "./adapter.js";
import { ModelProviderError } from "./types.js";

describe("Unified Gemma Model Adapter", () => {
  test("generates structured output with mock provider in test environment", async () => {
    const adapter = new GemmaModelAdapter({ provider: "mock" });
    const result = await adapter.generateText("Analyze candidate evidence");

    assert.equal(result.provider, "mock");
    assert.ok(result.text.length > 0);
    assert.ok(result.usage.totalTokens > 0);
    const parsed = JSON.parse(result.text);
    assert.equal(parsed.status, "demonstrated");
  });

  test("routes to Google AI and formats payload correctly", async () => {
    const mockFetch: typeof fetch = async (url, init) => {
      assert.ok(url.toString().includes("generativelanguage.googleapis.com"));
      assert.ok(url.toString().includes("key=test_api_key"));

      const body = JSON.parse(init?.body as string);
      assert.equal(body.contents[0].parts[0].text, "test prompt");
      assert.equal(body.generationConfig.temperature, 0.1);

      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "{\"status\":\"partially_demonstrated\"}" }] } }],
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 40, totalTokenCount: 140 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const adapter = new GemmaModelAdapter({
      provider: "google-ai",
      apiKey: "test_api_key",
      fetchFn: mockFetch,
    });

    const result = await adapter.generateText("test prompt");
    assert.equal(result.provider, "google-ai");
    assert.equal(result.usage.totalTokens, 140);
    assert.match(result.text, /partially_demonstrated/);
  });

  test("normalizes HTTP 429 rate limit to retryable ModelProviderError", async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response(JSON.stringify({ error: { message: "Resource exhausted" } }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    };

    const adapter = new GemmaModelAdapter({
      provider: "google-ai",
      apiKey: "test_key",
      fetchFn: mockFetch,
    });

    await assert.rejects(
      async () => adapter.generateText("prompt"),
      (err: unknown) => {
        assert.ok(err instanceof ModelProviderError);
        assert.equal((err as ModelProviderError).statusCode, 429);
        assert.equal((err as ModelProviderError).isRetryable, true);
        return true;
      }
    );
  });

  test("normalizes timeout to 504 retryable error", async () => {
    const mockFetch: typeof fetch = async (_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const abortError = new Error("The operation was aborted");
          abortError.name = "AbortError";
          reject(abortError);
        });
      });
    };

    const adapter = new GemmaModelAdapter({
      provider: "google-ai",
      apiKey: "test_key",
      fetchFn: mockFetch,
    });

    await assert.rejects(
      async () => adapter.generateText("prompt", { timeoutMs: 20 }),
      (err: unknown) => {
        assert.ok(err instanceof ModelProviderError);
        assert.equal((err as ModelProviderError).statusCode, 504);
        assert.equal((err as ModelProviderError).isRetryable, true);
        assert.match((err as ModelProviderError).message, /timed out/i);
        return true;
      }
    );
  });

  test("scrubs sensitive API keys from error messages", async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response("API call failed with key=secret_api_key_12345", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      });
    };

    const adapter = new GemmaModelAdapter({
      provider: "google-ai",
      apiKey: "secret_api_key_12345",
      fetchFn: mockFetch,
    });

    await assert.rejects(
      async () => adapter.generateText("prompt"),
      (err: unknown) => {
        assert.ok(err instanceof ModelProviderError);
        assert.ok(!err.message.includes("secret_api_key_12345"), "API key must not appear in error message");
        assert.ok(err.message.includes("key=***"), "API key must be masked with ***");
        return true;
      }
    );
  });

  test("distinguishes mock provider from real provider with explicit isMock flag", async () => {
    const mockAdapter = new GemmaModelAdapter({ provider: "mock" });
    const mockRes = await mockAdapter.generateText("test");
    assert.equal(mockRes.isMock, true);
    assert.equal(mockRes.provider, "mock");

    const realFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "{\"status\":\"demonstrated\"}" }] } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const realAdapter = new GemmaModelAdapter({
      provider: "google-ai",
      apiKey: "valid_key",
      fetchFn: realFetch,
    });
    const realRes = await realAdapter.generateText("test");
    assert.equal(realRes.isMock, false);
    assert.equal(realRes.provider, "google-ai");
  });

  test("correctly determines model architecture family and distinguishes Gemma from Gemini", () => {
    const geminiAdapter = new GemmaModelAdapter({ modelName: "gemini-3.8-flash" });
    assert.equal(geminiAdapter.getModelFamily(), "gemini");
    assert.equal(geminiAdapter.isGemmaEligible(), false);

    const gemmaAdapter = new GemmaModelAdapter({ modelName: "gemma-2-9b-it" });
    assert.equal(gemmaAdapter.getModelFamily(), "gemma");
    assert.equal(gemmaAdapter.isGemmaEligible(), true);

    const gemma27b = new GemmaModelAdapter({ modelName: "gemma-2-27b-it" });
    assert.equal(gemma27b.getModelFamily(), "gemma");
    assert.equal(gemma27b.isGemmaEligible(), true);
  });

  test("omits responseMimeType when querying Gemma models on Google AI Studio to prevent 400 rejection", async () => {
    let capturedBody: any;
    const mockFetch: typeof fetch = async (_url, init) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "{\"status\":\"demonstrated\"}" }] } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const gemmaAdapter = new GemmaModelAdapter({
      provider: "google-ai",
      modelName: "gemma-2-9b-it",
      apiKey: "test_key",
      fetchFn: mockFetch,
    });

    const res = await gemmaAdapter.generateText("test");
    assert.equal(res.isGemmaEligible, true);
    assert.equal(res.modelFamily, "gemma");
    assert.equal(capturedBody.generationConfig.responseMimeType, undefined);
  });
});
