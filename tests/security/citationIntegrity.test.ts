import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { CitationValidator } from "../../packages/assessment/src/validator.js";
import type { CandidateSnippet, EvidenceRecord } from "@parakh/contracts";

describe("Citation Security, Line Bounds & Exact Evidence Invariant Suite", () => {
  const commitSha = "e95ebb9e2b41e7974573735c1db7486812d16f18";
  const repository = "puneetnith28/parakh";

  const fileContent = [
    "import express from 'express';",
    "import { router } from './router.js';",
    "",
    "export function createServer() {",
    "  const app = express();",
    "  app.use('/api', router);",
    "  return app;",
    "}",
  ].join("\n");

  const records: EvidenceRecord[] = [
    {
      id: "ev_server",
      repository,
      commitSha,
      path: "apps/api/src/server.ts",
      canonicalUrl: `https://github.com/${repository}/blob/${commitSha}/apps/api/src/server.ts`,
      fileType: "source",
      lineCount: 8,
      content: fileContent,
      ingestionStatus: "full",
    },
    {
      id: "ev_empty",
      repository,
      commitSha,
      path: "empty.ts",
      canonicalUrl: `https://github.com/${repository}/blob/${commitSha}/empty.ts`,
      fileType: "source",
      lineCount: 0,
      content: "",
      ingestionStatus: "full",
    },
  ];

  const validUniverse: CandidateSnippet[] = [
    {
      candidateId: "cand_server_func",
      fileId: "ev_server",
      path: "apps/api/src/server.ts",
      commitSha,
      canonicalUrl: `https://github.com/${repository}/blob/${commitSha}/apps/api/src/server.ts#L4-L8`,
      startLine: 4,
      endLine: 8,
      content: "export function createServer() {\n  const app = express();\n  app.use('/api', router);\n  return app;\n}",
      fileType: "source",
    },
  ];

  test("1. Successfully accepts legitimate citations matching exact commit, repo, and lines", () => {
    const validator = new CitationValidator();
    const result = validator.validate(["cand_server_func"], validUniverse, records);

    assert.equal(result.allValid, true);
    assert.equal(result.validCount, 1);
    assert.equal(result.rejectedCount, 0);
    assert.equal(result.validCitations[0].repository, repository);
    assert.equal(result.validCitations[0].commitSha, commitSha);
    assert.equal(result.validCitations[0].path, "apps/api/src/server.ts");
    assert.equal(result.validCitations[0].startLine, 4);
    assert.equal(result.validCitations[0].endLine, 8);
  });

  test("2. Strictly rejects citations referencing a different or malicious repository in canonicalUrl", () => {
    const maliciousRepoUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_foreign_repo",
        fileId: "ev_server",
        path: "apps/api/src/server.ts",
        commitSha,
        canonicalUrl: `https://github.com/evil-org/other-repo/blob/${commitSha}/apps/api/src/server.ts#L4-L8`,
        startLine: 4,
        endLine: 8,
        content: "export function createServer() {\n  const app = express();\n  app.use('/api', router);\n  return app;\n}",
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const result = validator.validate(["cand_foreign_repo"], maliciousRepoUniverse, records);

    assert.equal(result.allValid, false);
    assert.equal(result.rejectedCount, 1);
    assert.equal(result.rejectedCitations[0].code, "REPOSITORY_MISMATCH");
    assert.match(result.rejectedCitations[0].reason, /evidence belongs to|does not match/i);
  });

  test("3. Strictly rejects citations referencing a stale or drifted commit SHA", () => {
    const staleSha = "d34db33f".repeat(5);
    const staleShaUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_stale_commit",
        fileId: "ev_server",
        path: "apps/api/src/server.ts",
        commitSha: staleSha,
        canonicalUrl: `https://github.com/${repository}/blob/${staleSha}/apps/api/src/server.ts#L4-L8`,
        startLine: 4,
        endLine: 8,
        content: "export function createServer() {\n  const app = express();\n  app.use('/api', router);\n  return app;\n}",
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const result = validator.validate(["cand_stale_commit"], staleShaUniverse, records);

    assert.equal(result.allValid, false);
    assert.equal(result.rejectedCount, 1);
    assert.equal(result.rejectedCitations[0].code, "COMMIT_SHA_MISMATCH");
    assert.match(result.rejectedCitations[0].reason, /pinned to/i);
  });

  test("4. Strictly rejects citations where canonicalUrl path does not match candidate path", () => {
    const urlMismatchUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_path_mismatch",
        fileId: "ev_server",
        path: "apps/api/src/server.ts",
        commitSha,
        canonicalUrl: `https://github.com/${repository}/blob/${commitSha}/apps/api/src/different.ts#L4-L8`,
        startLine: 4,
        endLine: 8,
        content: "export function createServer() {\n  const app = express();\n  app.use('/api', router);\n  return app;\n}",
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const result = validator.validate(["cand_path_mismatch"], urlMismatchUniverse, records);

    assert.equal(result.allValid, false);
    assert.equal(result.rejectedCitations[0].code, "CANONICAL_URL_MISMATCH");
  });

  test("5. Strictly rejects citations with out-of-bounds, inverted, or non-positive line ranges", () => {
    const validator = new CitationValidator();

    // End line exceeds file line count (8 lines total)
    const outOfBoundsUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_oob",
        fileId: "ev_server",
        path: "apps/api/src/server.ts",
        commitSha,
        canonicalUrl: `https://github.com/${repository}/blob/${commitSha}/apps/api/src/server.ts#L4-L50`,
        startLine: 4,
        endLine: 50,
        content: "test",
        fileType: "source",
      },
    ];
    const r1 = validator.validate(["cand_oob"], outOfBoundsUniverse, records);
    assert.equal(r1.allValid, false);
    assert.equal(r1.rejectedCitations[0].code, "INVALID_LINE_RANGE");

    // Inverted line range (startLine > endLine)
    const invertedUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_inverted",
        fileId: "ev_server",
        path: "apps/api/src/server.ts",
        commitSha,
        canonicalUrl: `https://github.com/${repository}/blob/${commitSha}/apps/api/src/server.ts#L6-L2`,
        startLine: 6,
        endLine: 2,
        content: "test",
        fileType: "source",
      },
    ];
    const r2 = validator.validate(["cand_inverted"], invertedUniverse, records);
    assert.equal(r2.allValid, false);
    assert.equal(r2.rejectedCitations[0].code, "INVALID_LINE_RANGE");

    // Zero or negative startLine
    const zeroStartUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_zero",
        fileId: "ev_server",
        path: "apps/api/src/server.ts",
        commitSha,
        canonicalUrl: `https://github.com/${repository}/blob/${commitSha}/apps/api/src/server.ts#L0-L4`,
        startLine: 0,
        endLine: 4,
        content: "test",
        fileType: "source",
      },
    ];
    const r3 = validator.validate(["cand_zero"], zeroStartUniverse, records);
    assert.equal(r3.allValid, false);
    assert.equal(r3.rejectedCitations[0].code, "INVALID_LINE_RANGE");
  });

  test("6. Strictly rejects citations referencing an empty file", () => {
    const emptyFileUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_empty_file",
        fileId: "ev_empty",
        path: "empty.ts",
        commitSha,
        canonicalUrl: `https://github.com/${repository}/blob/${commitSha}/empty.ts#L1-L1`,
        startLine: 1,
        endLine: 1,
        content: "anything",
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const result = validator.validate(["cand_empty_file"], emptyFileUniverse, records);

    assert.equal(result.allValid, false);
    assert.equal(result.rejectedCitations[0].code, "INVALID_LINE_RANGE");
  });

  test("7. Strictly rejects citations with empty or whitespace-only snippet text", () => {
    const whitespaceUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_empty_snippet",
        fileId: "ev_server",
        path: "apps/api/src/server.ts",
        commitSha,
        canonicalUrl: `https://github.com/${repository}/blob/${commitSha}/apps/api/src/server.ts#L4-L6`,
        startLine: 4,
        endLine: 6,
        content: "   \n\t  \n  ",
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const result = validator.validate(["cand_empty_snippet"], whitespaceUniverse, records);

    assert.equal(result.allValid, false);
    assert.equal(result.rejectedCitations[0].code, "EMPTY_SNIPPET");
  });

  test("8. Strictly enforces substantive-match threshold (rejects partial snippet abuse < 70% coverage)", () => {
    // Target lines 4-8 is 108 characters. Citing only "return app;" is 11 chars (10% ratio)
    const partialUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_partial",
        fileId: "ev_server",
        path: "apps/api/src/server.ts",
        commitSha,
        canonicalUrl: `https://github.com/${repository}/blob/${commitSha}/apps/api/src/server.ts#L4-L8`,
        startLine: 4,
        endLine: 8,
        content: "return app;",
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const result = validator.validate(["cand_partial"], partialUniverse, records);

    assert.equal(result.allValid, false);
    assert.equal(result.rejectedCitations[0].code, "CONTENT_MISMATCH");
    assert.match(result.rejectedCitations[0].reason, /does not substantively match/i);
  });

  test("9. Strictly rejects fabricated snippet text that does not match target line content", () => {
    const fabricatedUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_fabricated",
        fileId: "ev_server",
        path: "apps/api/src/server.ts",
        commitSha,
        canonicalUrl: `https://github.com/${repository}/blob/${commitSha}/apps/api/src/server.ts#L1-L2`,
        startLine: 1,
        endLine: 2,
        content: "export const secret = 'fabricated';",
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const result = validator.validate(["cand_fabricated"], fabricatedUniverse, records);

    assert.equal(result.allValid, false);
    assert.equal(result.rejectedCitations[0].code, "CONTENT_MISMATCH");
  });

  test("10. Correctly handles normalized path notations and Windows backslashes", () => {
    const pathVariantsUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_windows_path",
        fileId: "ev_server",
        path: ".\\apps\\api\\src\\server.ts", // Windows backslash notation with leading dot
        commitSha,
        canonicalUrl: `https://github.com/${repository}/blob/${commitSha}/apps/api/src/server.ts#L4-L8`,
        startLine: 4,
        endLine: 8,
        content: "export function createServer() {\n  const app = express();\n  app.use('/api', router);\n  return app;\n}",
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const result = validator.validate(["cand_windows_path"], pathVariantsUniverse, records);

    assert.equal(result.allValid, true);
    assert.equal(result.validCount, 1);
  });

  test("11. Correctly handles Windows CRLF vs Unix LF newline discrepancies", () => {
    // Ingested record uses CRLF
    const crlfRecord: EvidenceRecord = {
      id: "ev_crlf",
      repository,
      commitSha,
      path: "src/windows.ts",
      canonicalUrl: `https://github.com/${repository}/blob/${commitSha}/src/windows.ts`,
      fileType: "source",
      lineCount: 3,
      content: "const a = 1;\r\nconst b = 2;\r\nconst c = 3;",
      ingestionStatus: "full",
    };

    // Candidate snippet uses Unix LF
    const unixUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_unix_lf",
        fileId: "ev_crlf",
        path: "src/windows.ts",
        commitSha,
        canonicalUrl: `https://github.com/${repository}/blob/${commitSha}/src/windows.ts#L1-L3`,
        startLine: 1,
        endLine: 3,
        content: "const a = 1;\nconst b = 2;\nconst c = 3;",
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const result = validator.validate(["cand_unix_lf"], unixUniverse, [crlfRecord]);

    assert.equal(result.allValid, true);
    assert.equal(result.validCount, 1);
  });
});
