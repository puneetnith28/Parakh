import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GemmaClient } from "./client.js";

describe("Gemma Conservative Reasoning Client", () => {
  test("strictly clamps temperature to [0.0, 0.2] range to minimize hallucination", () => {
    // Attempting high temperature (e.g. 0.9 or 1.5) must be clamped to 0.2
    const clientHigh = new GemmaClient({ temperature: 0.9 });
    assert.equal(clientHigh.temperature, 0.2);

    // Negative temperature clamped to 0.0
    const clientLow = new GemmaClient({ temperature: -0.5 });
    assert.equal(clientLow.temperature, 0.0);

    // Default is 0.1
    const clientDefault = new GemmaClient();
    assert.equal(clientDefault.temperature, 0.1);
  });

  test("verifies mock readiness cleanly", async () => {
    const client = new GemmaClient({ provider: "mock" });
    const readiness = await client.checkReadiness();

    assert.equal(readiness.ready, true);
    assert.equal(readiness.provider, "mock");
    assert.ok(readiness.message.includes("is ready"));
  });

  test("executes conservative reasoning prompt and receives structured result", async () => {
    const client = new GemmaClient({ provider: "mock" });
    const result = await client.executeConservativeReasoning("Evaluate evidence candidate snippet");

    assert.ok(result.text.length > 0);
    assert.equal(result.provider, "mock");
  });

  test("readiness check surfaces missing key failure without crash", async () => {
    // Configured with google-ai but without key
    const client = new GemmaClient({ provider: "google-ai", apiKey: "" });
    const readiness = await client.checkReadiness();

    assert.equal(readiness.ready, false);
    assert.match(readiness.message, /Missing MODEL_API_KEY/i);
  });
});
