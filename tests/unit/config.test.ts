import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadConfig, getModelFamily, isGemmaModel } from "../../apps/api/src/config.js";

describe("Configuration and Model Provider Mode Validation", () => {
  test("allows explicit mock provider in development", () => {
    const cfg = loadConfig({
      NODE_ENV: "development",
      MODEL_PROVIDER: "mock",
    });
    assert.equal(cfg.MODEL_PROVIDER, "mock");
    assert.equal(cfg.NODE_ENV, "development");
  });

  test("allows explicit mock provider in production for controlled staging/demos", () => {
    const cfg = loadConfig({
      NODE_ENV: "production",
      MODEL_PROVIDER: "mock",
      WEB_ORIGIN: "https://parakh.example.com",
      FRONTEND_URL: "https://parakh.example.com",
      API_BASE_URL: "https://api.parakh.example.com",
    });
    assert.equal(cfg.MODEL_PROVIDER, "mock");
    assert.equal(cfg.NODE_ENV, "production");
  });

  test("rejects production configuration when real provider selected but API key is missing", () => {
    assert.throws(
      () => {
        loadConfig({
          NODE_ENV: "production",
          MODEL_PROVIDER: "google",
          WEB_ORIGIN: "https://parakh.example.com",
          FRONTEND_URL: "https://parakh.example.com",
          API_BASE_URL: "https://api.parakh.example.com",
          MODEL_API_KEY: "",
          AI_STUDIO_API_KEY: "",
        });
      },
      (err: Error) => {
        assert.match(err.message, /In production mode, MODEL_API_KEY/);
        return true;
      }
    );
  });

  test("accepts production configuration when credentials are validly supplied", () => {
    const cfg = loadConfig({
      NODE_ENV: "production",
      MODEL_PROVIDER: "google",
      MODEL_API_KEY: "valid_production_key_12345",
      WEB_ORIGIN: "https://parakh.example.com",
      FRONTEND_URL: "https://parakh.example.com",
      API_BASE_URL: "https://api.parakh.example.com",
    });
    assert.equal(cfg.MODEL_PROVIDER, "google");
    assert.equal(cfg.MODEL_API_KEY, "valid_production_key_12345");
  });

  test("rejects invalid or unsupported model provider with actionable error", () => {
    assert.throws(
      () => {
        loadConfig({
          MODEL_PROVIDER: "unsupported_ai_vendor_xyz",
        });
      },
      (err: Error) => {
        assert.match(err.message, /Unsupported MODEL_PROVIDER 'unsupported_ai_vendor_xyz'/);
        assert.match(err.message, /Supported providers are:/);
        return true;
      }
    );
  });

  test("defaults model identifier consistently to gemini-3.8-flash", () => {
    const cfg = loadConfig({
      NODE_ENV: "development",
      MODEL_PROVIDER: "mock",
    });
    assert.equal(cfg.MODEL_NAME, "gemini-3.8-flash");
    assert.equal(getModelFamily(cfg.MODEL_NAME), "gemini");
    assert.equal(isGemmaModel(cfg.MODEL_NAME), false);
  });

  test("resolves GEMMA_MODEL_ID when MODEL_NAME is omitted", () => {
    const cfg = loadConfig({
      NODE_ENV: "development",
      MODEL_PROVIDER: "mock",
      GEMMA_MODEL_ID: "gemma-2-9b-it",
    });
    assert.equal(cfg.MODEL_NAME, "gemma-2-9b-it");
    assert.equal(getModelFamily(cfg.MODEL_NAME), "gemma");
    assert.equal(isGemmaModel(cfg.MODEL_NAME), true);
  });

  test("accurately classifies model families and Gemma eligibility", () => {
    assert.equal(getModelFamily("gemma-2-9b-it"), "gemma");
    assert.equal(isGemmaModel("gemma-2-9b-it"), true);

    assert.equal(getModelFamily("gemma-2-27b-it"), "gemma");
    assert.equal(isGemmaModel("gemma-2-27b-it"), true);

    assert.equal(getModelFamily("gemini-1.5-flash"), "gemini");
    assert.equal(isGemmaModel("gemini-1.5-flash"), false);

    assert.equal(getModelFamily("gemini-3.8-flash"), "gemini");
    assert.equal(isGemmaModel("gemini-3.8-flash"), false);

    assert.equal(getModelFamily("llama-3-70b"), "other");
    assert.equal(isGemmaModel("llama-3-70b"), false);
  });
});
