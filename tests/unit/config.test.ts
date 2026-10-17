import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../../apps/api/src/config.js";

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
});
