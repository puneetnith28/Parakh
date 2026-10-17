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
