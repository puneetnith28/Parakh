/**
 * Text Normalization and Deterministic Line Number Mapping Service.
 *
 * Normalizes newlines (CRLF / CR -> LF), strips BOM and null bytes,
 * and maintains an exact 1-indexed line offset mapping for verifiable citations.
 */

export interface LineSliceResult {
  startLine: number;
  endLine: number;
  content: string;
  lineCount: number;
}

export function normalizeText(raw: string): string {
  if (!raw) return "";

  // 1. Strip UTF-8 Byte Order Mark (BOM)
  let clean = raw.startsWith("\uFEFF") ? raw.slice(1) : raw;

  // 2. Strip null bytes
  clean = clean.replace(/\0/g, "");

  // 3. Normalize CRLF and CR to standard LF
  clean = clean.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  return clean;
}

export class NormalizedDocument {
  public readonly text: string;
  public readonly lines: string[];
  public readonly totalLines: number;

  constructor(rawText: string) {
    this.text = normalizeText(rawText);
    // When text is empty, treat as 0 lines
    if (this.text.length === 0) {
      this.lines = [];
      this.totalLines = 0;
    } else {
      this.lines = this.text.split("\n");
      this.totalLines = this.lines.length;
    }
  }

  /**
   * Extract a deterministic 1-indexed line slice [startLine, endLine] inclusive.
   *
   * @param startLine 1-indexed start line (inclusive)
   * @param endLine 1-indexed end line (inclusive)
   */
  getLines(startLine: number, endLine: number): LineSliceResult {
    if (this.totalLines === 0) {
      return { startLine: 1, endLine: 1, content: "", lineCount: 0 };
    }

    // Clamp boundaries
    const clampedStart = Math.max(1, Math.min(startLine, this.totalLines));
    const clampedEnd = Math.max(clampedStart, Math.min(endLine, this.totalLines));

    // Array slice is 0-indexed: [clampedStart - 1, clampedEnd)
    const selectedLines = this.lines.slice(clampedStart - 1, clampedEnd);

    return {
      startLine: clampedStart,
      endLine: clampedEnd,
      content: selectedLines.join("\n"),
      lineCount: selectedLines.length,
    };
  }

  /**
   * Find 1-indexed line range for a substring or token if present.
   */
  findSubstringLineRange(target: string): { startLine: number; endLine: number } | null {
    if (!target || !this.text.includes(target)) {
      return null;
    }

    const index = this.text.indexOf(target);
    const beforeText = this.text.slice(0, index);
    const startLine = beforeText.split("\n").length;
    const matchLines = target.split("\n").length;
    const endLine = startLine + matchLines - 1;

    return { startLine, endLine };
  }
}
