import test from "node:test";
import assert from "node:assert/strict";
import { TextSanitizer } from "./textSanitizer.js";

test("TextSanitizer cleans CRLF and control characters", () => {
  const dirty = "Line 1\r\nLine 2\x00\x07\r\nLine 3\tTabbed";
  const result = TextSanitizer.sanitize(dirty);
  assert.equal(result.sanitizedText, "Line 1\nLine 2\nLine 3\tTabbed");
  assert.ok(result.characterCount > 0);
});

test("TextSanitizer rejects empty input", () => {
  assert.throws(() => TextSanitizer.sanitize("   \n\t  "), /empty or whitespace only/);
});

test("TextSanitizer rejects non-string input", () => {
  assert.throws(() => TextSanitizer.sanitize(12345 as any), /valid text string/);
});

test("TextSanitizer rejects oversized input", () => {
  const huge = "a".repeat(50001);
  assert.throws(() => TextSanitizer.sanitize(huge), /exceeds maximum allowed limit/);
});
