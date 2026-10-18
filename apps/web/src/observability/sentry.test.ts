import test from "node:test";
import assert from "node:assert/strict";
import { scrubFrontendUrl } from "./sentry.js";

test("scrubFrontendUrl redacts token query parameter from report share URLs", () => {
  const urlWithToken = "http://localhost:5173/reports/rep_12345?token=abcdef1234567890abcdef1234567890";
  const scrubbed = scrubFrontendUrl(urlWithToken);

  assert.equal(scrubbed.includes("abcdef1234567890abcdef1234567890"), false);
  assert.ok(scrubbed.includes("token=%5BREDACTED_VIEW_TOKEN%5D") || scrubbed.includes("token=[REDACTED"));
});

test("scrubFrontendUrl preserves URL structure without tokens", () => {
  const cleanUrl = "http://localhost:5173/assessment/results";
  const scrubbed = scrubFrontendUrl(cleanUrl);

  assert.equal(scrubbed, cleanUrl);
});
