import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { chunkEvidenceRecord } from "./chunker.js";
import type { EvidenceRecord } from "@parakh/contracts";

describe("Context-Aware Code Chunker with Line Offsets", () => {
  test("preserves single chunk for files under max chunk threshold", () => {
    const record: EvidenceRecord = {
      id: "ev_short",
      repository: "org/repo",
      commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
      path: "src/math.ts",
      canonicalUrl: "https://github.com/org/repo/blob/4f738b55239a031a0e4c6c0e816a2d1f4d924cb5/src/math.ts",
      fileType: "source",
      language: "TypeScript",
      lineCount: 10,
      content: "export function add(a: number, b: number): number {\n  return a + b;\n}",
      ingestionStatus: "full",
    };

    const chunks = chunkEvidenceRecord(record);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].startLine, 1);
    assert.equal(chunks[0].endLine, 3);
    assert.equal(chunks[0].enclosingScope, "add");
    assert.ok(chunks[0].canonicalUrl.includes("#L1-L3"));
  });

  test("chunks large multi-function files along declaration boundaries", () => {
    // Generate a file with 150 lines containing functions every 30 lines
    const lines: string[] = [];
    lines.push("// Module header");
    for (let f = 1; f <= 5; f++) {
      lines.push(`export function serviceOperation${f}() {`);
      for (let i = 0; i < 25; i++) {
        lines.push(`  console.log("step ${i} in op ${f}");`);
      }
      lines.push("}");
      lines.push("");
    }

    const totalLines = lines.length;
    const record: EvidenceRecord = {
      id: "ev_large",
      repository: "org/repo",
      commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
      path: "src/service.ts",
      canonicalUrl: "https://github.com/org/repo/blob/4f738b55239a031a0e4c6c0e816a2d1f4d924cb5/src/service.ts",
      fileType: "source",
      language: "TypeScript",
      lineCount: totalLines,
      content: lines.join("\n"),
      ingestionStatus: "full",
    };

    const chunks = chunkEvidenceRecord(record, {
      targetChunkLines: 50,
      minChunkLines: 20,
      maxChunkLines: 80,
    });

    assert.ok(chunks.length >= 2, "Expected multiple chunks for large file");

    // Verify contiguous line coverage without gaps or overlaps
    assert.equal(chunks[0].startLine, 1);
    for (let c = 1; c < chunks.length; c++) {
      assert.equal(chunks[c].startLine, chunks[c - 1].endLine + 1);
    }
    assert.equal(chunks[chunks.length - 1].endLine, totalLines);

    // Verify all chunks have permalinks with line ranges
    for (const chunk of chunks) {
      assert.ok(chunk.canonicalUrl.includes(`#L${chunk.startLine}-L${chunk.endLine}`));
    }
  });

  test("chunks Python files recognizing def and class boundaries", () => {
    const pyLines: string[] = [
      "# Python API Service",
      "import os",
      "",
      "class AuthService:",
      "    def __init__(self):",
      "        pass",
    ];
    for (let i = 0; i < 70; i++) {
      pyLines.push(`    def method_${i}(self): return ${i}`);
    }

    const record: EvidenceRecord = {
      id: "ev_py",
      repository: "org/repo",
      commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
      path: "app/auth.py",
      canonicalUrl: "https://github.com/org/repo/blob/4f738b55239a031a0e4c6c0e816a2d1f4d924cb5/app/auth.py",
      fileType: "source",
      language: "Python",
      lineCount: pyLines.length,
      content: pyLines.join("\n"),
      ingestionStatus: "full",
    };

    const chunks = chunkEvidenceRecord(record, { targetChunkLines: 40, maxChunkLines: 60 });
    assert.ok(chunks.length >= 2);
    assert.equal(chunks[0].startLine, 1);
    assert.equal(chunks[chunks.length - 1].endLine, pyLines.length);
  });
});
