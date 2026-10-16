import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeText, NormalizedDocument } from "./normalizer.js";

describe("Text Normalization & Deterministic Line Mapping", () => {
  test("strips BOM and converts Windows CRLF to LF", () => {
    const raw = "\uFEFFline1\r\nline2\r\nline3\r\n";
    const normalized = normalizeText(raw);
    assert.equal(normalized, "line1\nline2\nline3\n");
    assert.ok(!normalized.includes("\r"));
    assert.ok(!normalized.startsWith("\uFEFF"));
  });

  test("strips null bytes from text", () => {
    const raw = "hello\0world\0!";
    const normalized = normalizeText(raw);
    assert.equal(normalized, "helloworld!");
  });

  test("slices 1-indexed lines accurately", () => {
    const sourceCode = [
      "// Line 1: Header",
      "import express from 'express';", // 2
      "", // 3
      "const app = express();", // 4
      "app.use(express.json());", // 5
      "", // 6
      "app.get('/health', (req, res) => {", // 7
      "  res.json({ ok: true });", // 8
      "});", // 9
      "", // 10
      "export default app;", // 11
    ].join("\n");

    const doc = new NormalizedDocument(sourceCode);
    assert.equal(doc.totalLines, 11);

    // Slice lines 7 to 9
    const slice = doc.getLines(7, 9);
    assert.equal(slice.startLine, 7);
    assert.equal(slice.endLine, 9);
    assert.equal(slice.lineCount, 3);
    assert.equal(
      slice.content,
      "app.get('/health', (req, res) => {\n  res.json({ ok: true });\n});"
    );
  });

  test("clamps out of bound line numbers safely", () => {
    const text = "first line\nsecond line\nthird line";
    const doc = new NormalizedDocument(text);

    const slice = doc.getLines(-5, 999);
    assert.equal(slice.startLine, 1);
    assert.equal(slice.endLine, 3);
    assert.equal(slice.lineCount, 3);
    assert.equal(slice.content, text);
  });

  test("finds substring line range accurately", () => {
    const code = "const a = 1;\nconst target = () => {\n  return 42;\n};\nconst b = 2;";
    const doc = new NormalizedDocument(code);

    const range = doc.findSubstringLineRange("const target = () => {\n  return 42;\n};");
    assert.ok(range);
    assert.equal(range.startLine, 2);
    assert.equal(range.endLine, 4);
  });

  test("handles empty text gracefully", () => {
    const doc = new NormalizedDocument("");
    assert.equal(doc.totalLines, 0);

    const slice = doc.getLines(1, 10);
    assert.equal(slice.content, "");
    assert.equal(slice.lineCount, 0);
  });
});
