import type { EvidenceRecord, FileType } from "@parakh/contracts";

/**
 * Context-Aware Code Chunking Engine.
 *
 * Divides large files into semantically bounded snippets along function,
 * class, or logical block boundaries, preserving verified 1-indexed line ranges
 * and enclosing declaration metadata.
 */

export interface ChunkerOptions {
  targetChunkLines?: number; // default: 60
  minChunkLines?: number; // default: 15
  maxChunkLines?: number; // default: 100
}

export interface CodeChunk {
  id: string;
  fileId: string;
  filePath: string;
  commitSha: string;
  canonicalUrl: string;
  fileType: FileType;
  language?: string;
  startLine: number; // 1-indexed
  endLine: number; // 1-indexed
  lineCount: number;
  content: string;
  enclosingScope?: string;
}

// Regex to identify natural boundary declarations across TS/JS, Python, Go, Rust, Java
const BOUNDARY_REGEX = /^(?:export\s+|pub\s+|async\s+)*(?:class\s+|function\s+|def\s+|func\s+|interface\s+|type\s+|struct\s+|impl\s+|enum\s+|const\s+[A-Za-z0-9_]+\s*=\s*(?:async\s+)?\(|\b(?:describe|test|it)\s*\()/;

const SCOPE_EXTRACTOR = /^(?:export\s+|pub\s+|async\s+)*(?:class|function|def|func|interface|type|struct|impl|enum)\s+([A-Za-z0-9_]+)/;

/**
 * Chunk an EvidenceRecord into semantically bounded CodeChunks with 1-indexed line ranges.
 */
export function chunkEvidenceRecord(
  record: EvidenceRecord,
  options: ChunkerOptions = {}
): CodeChunk[] {
  const targetLines = options.targetChunkLines ?? 60;
  const maxLines = options.maxChunkLines ?? 100;
  const minLines = options.minChunkLines ?? 15;

  const lines = record.content.split("\n");
  const totalLines = lines.length;

  // Single chunk for small or medium files
  if (totalLines <= maxLines) {
    const scopeMatch = lines[0]?.match(SCOPE_EXTRACTOR);
    return [
      {
        id: `chunk_${record.id}_1_${totalLines}`,
        fileId: record.id,
        filePath: record.path,
        commitSha: record.commitSha,
        canonicalUrl: `${record.canonicalUrl}#L1-L${totalLines}`,
        fileType: record.fileType,
        language: record.language,
        startLine: 1,
        endLine: totalLines,
        lineCount: totalLines,
        content: record.content,
        enclosingScope: scopeMatch ? scopeMatch[1] : undefined,
      },
    ];
  }

  const chunks: CodeChunk[] = [];
  let currentStart = 1; // 1-indexed
  let currentScope: string | undefined;

  while (currentStart <= totalLines) {
    // Determine theoretical end
    const theoreticalEnd = Math.min(currentStart + targetLines - 1, totalLines);

    if (theoreticalEnd >= totalLines) {
      // Final remainder
      const chunkLines = lines.slice(currentStart - 1, totalLines);
      chunks.push({
        id: `chunk_${record.id}_${currentStart}_${totalLines}`,
        fileId: record.id,
        filePath: record.path,
        commitSha: record.commitSha,
        canonicalUrl: `${record.canonicalUrl}#L${currentStart}-L${totalLines}`,
        fileType: record.fileType,
        language: record.language,
        startLine: currentStart,
        endLine: totalLines,
        lineCount: chunkLines.length,
        content: chunkLines.join("\n"),
        enclosingScope: currentScope,
      });
      break;
    }

    // Look for natural boundary between [currentStart + minLines, currentStart + maxLines]
    const searchStart = Math.min(currentStart + minLines - 1, totalLines);
    const searchEnd = Math.min(currentStart + maxLines - 1, totalLines);

    let splitIndex = -1;
    for (let i = searchStart; i <= searchEnd; i++) {
      const lineText = lines[i]?.trimStart() || "";
      if (BOUNDARY_REGEX.test(lineText)) {
        splitIndex = i; // 0-indexed line index where boundary begins
        const scope = lineText.match(SCOPE_EXTRACTOR);
        if (scope) {
          currentScope = scope[1];
        }
        break;
      }
    }

    // If no clean boundary found, split at theoreticalEnd
    const finalEndLine = splitIndex !== -1 ? splitIndex : theoreticalEnd; // 1-indexed

    const chunkLines = lines.slice(currentStart - 1, finalEndLine);
    chunks.push({
      id: `chunk_${record.id}_${currentStart}_${finalEndLine}`,
      fileId: record.id,
      filePath: record.path,
      commitSha: record.commitSha,
      canonicalUrl: `${record.canonicalUrl}#L${currentStart}-L${finalEndLine}`,
      fileType: record.fileType,
      language: record.language,
      startLine: currentStart,
      endLine: finalEndLine,
      lineCount: chunkLines.length,
      content: chunkLines.join("\n"),
      enclosingScope: currentScope,
    });

    currentStart = finalEndLine + 1;
  }

  return chunks;
}
