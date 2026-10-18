import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ElevenLabsAdapter,
  BackboardAdapter,
  DigitalOceanAdapter,
  getSecondaryFeatureFlags,
} from "./index.js";

describe("Secondary Sponsor Adapters & Feature Flags", () => {
  it("getSecondaryFeatureFlags safely resolves boolean flags from env", () => {
    const flags = getSecondaryFeatureFlags();
    assert.equal(typeof flags.enableElevenLabsAudio, "boolean");
    assert.equal(typeof flags.enableBackboardMemory, "boolean");
    assert.equal(typeof flags.enableDigitalOceanWorkers, "boolean");
  });

  describe("ElevenLabsAdapter", () => {
    it("reports unconfigured and returns skipped when API key is missing", async () => {
      const adapter = new ElevenLabsAdapter("");
      assert.equal(adapter.isEnabled(), false);

      const result = await adapter.narrateSummary("Excellent code quality.");
      assert.equal(result.success, false);
      assert.ok(result.skippedReason?.includes("ELEVENLABS_API_KEY"));
    });

    it("handles empty text gracefully without throwing", async () => {
      const adapter = new ElevenLabsAdapter("dummy-key");
      const result = await adapter.narrateSummary("");
      assert.equal(result.success, false);
      assert.equal(result.skippedReason, "Summary text is empty.");
    });

    it("successfully generates Base64 audio when API responds with audio buffer", async () => {
      const mockAudioBytes = Buffer.from("fake-mp3-audio-stream-content");
      const mockFetch: typeof fetch = async (url, init) => {
        assert.ok(String(url).includes("text-to-speech"));
        assert.equal((init?.headers as any)?.["xi-api-key"], "test-key-123");
        return new Response(mockAudioBytes, {
          status: 200,
          headers: { "Content-Type": "audio/mpeg" },
        });
      };

      const adapter = new ElevenLabsAdapter({
        apiKey: "test-key-123",
        fetchFn: mockFetch,
      });

      const result = await adapter.narrateSummary("Candidate demonstrated clean architecture and testing.");
      assert.equal(result.success, true);
      assert.equal(result.mimeType, "audio/mpeg");
      assert.equal(result.audioBase64, mockAudioBytes.toString("base64"));
      assert.equal(result.byteLength, mockAudioBytes.byteLength);
      assert.ok(result.durationEstimateSeconds && result.durationEstimateSeconds > 0);
    });

    it("maps HTTP 401 and 429 status codes without exposing API key", async () => {
      const mockFetch401: typeof fetch = async () => new Response("Unauthorized", { status: 401 });
      const adapter401 = new ElevenLabsAdapter({ apiKey: "secret-key-xyz", fetchFn: mockFetch401 });
      const res401 = await adapter401.narrateSummary("Sample text");
      assert.equal(res401.success, false);
      assert.ok(res401.skippedReason?.includes("authentication failed (HTTP 401)"));
      assert.equal(res401.skippedReason?.includes("secret-key-xyz"), false);

      const mockFetch429: typeof fetch = async () => new Response("Too Many Requests", { status: 429 });
      const adapter429 = new ElevenLabsAdapter({ apiKey: "secret-key-xyz", fetchFn: mockFetch429 });
      const res429 = await adapter429.narrateSummary("Sample text");
      assert.equal(res429.success, false);
      assert.ok(res429.skippedReason?.includes("rate limit or quota exceeded (HTTP 429)"));
    });

    it("enforces timeout bounds when upstream hangs", async () => {
      const hangingFetch: typeof fetch = async (_url, init) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      };

      const adapter = new ElevenLabsAdapter({
        apiKey: "timeout-key",
        timeoutMs: 50,
        fetchFn: hangingFetch,
      });

      const res = await adapter.narrateSummary("Testing timeout");
      assert.equal(res.success, false);
      assert.ok(res.skippedReason?.includes("timed out after 50ms"));
    });

    it("rejects oversized audio buffers exceeding safety ceiling", async () => {
      const oversizedBytes = new Uint8Array(5 * 1024 * 1024 + 100);
      const mockFetch: typeof fetch = async () => new Response(oversizedBytes, { status: 200 });

      const adapter = new ElevenLabsAdapter({ apiKey: "key", fetchFn: mockFetch });
      const res = await adapter.narrateSummary("Short text");
      assert.equal(res.success, false);
      assert.ok(res.skippedReason?.includes("exceeded safe size limit"));
    });
  });

  describe("BackboardAdapter", () => {
    it("returns unconfigured when key is missing", async () => {
      const adapter = new BackboardAdapter("");
      assert.equal(adapter.isEnabled(), false);

      const res = await adapter.recordAssessmentMemory({
        candidateId: "cand-1",
        assessmentId: "assess-1",
        overallScore: 88,
        topStrengths: ["Type safety"],
        recordedAt: new Date().toISOString(),
      });

      assert.equal(res.recorded, false);
      assert.ok(res.reason?.includes("BACKBOARD_API_KEY not configured"));
    });
  });

  describe("DigitalOceanAdapter", () => {
    it("safely falls back to primary Render container when token is absent", async () => {
      const adapter = new DigitalOceanAdapter("");
      assert.equal(adapter.isEnabled(), false);

      const status = await adapter.checkWorkerStatus();
      assert.equal(status.available, true);
      assert.equal(status.provider, "render");
      assert.ok(status.status.includes("Render"));
    });

    it("provides valid worker specification schema", () => {
      const adapter = new DigitalOceanAdapter("mock-token");
      const spec = adapter.getWorkerSpecification();
      assert.equal(spec.name, "parakh-eval-worker");
      assert.equal(spec.region, "nyc3");
      assert.equal(spec.instanceCount, 1);
    });
  });
});
