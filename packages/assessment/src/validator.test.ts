import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CitationValidator } from "./validator.js";
import type { CandidateSnippet, EvidenceRecord } from "@parakh/contracts";

describe("Deterministic Citation Validation Engine", () => {
  const commitSha = "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5";

  const records: EvidenceRecord[] = [
    {
      id: "ev_1",
      repository: "org/repo",
      commitSha,
      path: "src/auth.ts",
      canonicalUrl: `https://github.com/org/repo/blob/${commitSha}/src/auth.ts`,
      fileType: "source",
      lineCount: 30,
      content: "export function verifyToken(token: string) {\n  return token.length > 0;\n}",
      ingestionStatus: "full",
    },
  ];

  const candidateUniverse: CandidateSnippet[] = [
    {
      candidateId: "cand_001",
      fileId: "ev_1",
      path: "src/auth.ts",
      commitSha,
      canonicalUrl: `https://github.com/org/repo/blob/${commitSha}/src/auth.ts#L1-L3`,
      startLine: 1,
      endLine: 3,
      content: "export function verifyToken(token: string) {\n  return token.length > 0;\n}",
      fileType: "source",
    },
  ];

  test("accepts valid citations matching universe and repository records", () => {
    const validator = new CitationValidator();
    const outcome = validator.validate(["cand_001"], candidateUniverse, records);

    assert.equal(outcome.allValid, true);
    assert.equal(outcome.validCount, 1);
    assert.equal(outcome.rejectedCount, 0);
    assert.equal(outcome.validCitations[0].candidateId, "cand_001");
    assert.equal(outcome.validCitations[0].path, "src/auth.ts");
  });

  test("strictly rejects hallucinated candidate IDs not in universe", () => {
    const validator = new CitationValidator();
    const outcome = validator.validate(["cand_999", "cand_ghost"], candidateUniverse, records);

    assert.equal(outcome.allValid, false);
    assert.equal(outcome.validCount, 0);
    assert.equal(outcome.rejectedCount, 2);
    assert.equal(outcome.rejectedCitations[0].code, "HALLUCINATED_CANDIDATE_ID");
  });

  test("rejects candidate pointing to non-existent file path", () => {
    const fakeUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_fake",
        fileId: "f_fake",
        path: "src/imaginary/ghost.ts",
        commitSha,
        canonicalUrl: "https://github.com/org/repo/blob/sha/src/imaginary/ghost.ts",
        startLine: 1,
        endLine: 10,
        content: "fake content",
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const outcome = validator.validate(["cand_fake"], fakeUniverse, records);

    assert.equal(outcome.allValid, false);
    assert.equal(outcome.rejectedCitations[0].code, "HALLUCINATED_FILE_PATH");
  });

  test("rejects citations with out-of-bounds line numbers", () => {
    const invalidLineUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_bad_lines",
        fileId: "ev_1",
        path: "src/auth.ts",
        commitSha,
        canonicalUrl: "https://github.com/org/repo/blob/sha/src/auth.ts#L100-L200",
        startLine: 100, // file only has 30 lines
        endLine: 200,
        content: "some text",
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const outcome = validator.validate(["cand_bad_lines"], invalidLineUniverse, records);

    assert.equal(outcome.allValid, false);
    assert.equal(outcome.rejectedCitations[0].code, "INVALID_LINE_RANGE");
  });

  test("rejects citations where snippet content does not match source lines", () => {
    const mismatchUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_mismatched",
        fileId: "ev_1",
        path: "src/auth.ts",
        commitSha,
        canonicalUrl: `https://github.com/org/repo/blob/${commitSha}/src/auth.ts#L1-L3`,
        startLine: 1,
        endLine: 3,
        content: "completely fabricated snippet that does not exist in auth.ts",
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const outcome = validator.validate(["cand_mismatched"], mismatchUniverse, records);

    assert.equal(outcome.allValid, false);
    assert.equal(outcome.rejectedCitations[0].code, "CONTENT_MISMATCH");
    assert.match(outcome.rejectedCitations[0].reason, /Snippet text could not be verified/);
  });

  test("accepts citations matching source lines with minor whitespace differences", () => {
    const wsUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_ws",
        fileId: "ev_1",
        path: "src/auth.ts",
        commitSha,
        canonicalUrl: `https://github.com/org/repo/blob/${commitSha}/src/auth.ts#L1-L3`,
        startLine: 1,
        endLine: 3,
        content: "export   function   verifyToken(token: string) {\nreturn token.length > 0;\n}",
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const outcome = validator.validate(["cand_ws"], wsUniverse, records);

    assert.equal(outcome.allValid, true);
    assert.equal(outcome.validCount, 1);
  });

  test("strictly rejects partial snippet abuse (citing 3 lines with only 1 word snippet)", () => {
    const partialUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_abuse",
        fileId: "ev_1",
        path: "src/auth.ts",
        commitSha,
        canonicalUrl: `https://github.com/org/repo/blob/${commitSha}/src/auth.ts#L1-L3`,
        startLine: 1,
        endLine: 3,
        content: "token", // Only 1 token out of 3 full lines (substantive ratio < 0.7)
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const outcome = validator.validate(["cand_abuse"], partialUniverse, records);

    assert.equal(outcome.allValid, false);
    assert.equal(outcome.rejectedCitations[0].code, "CONTENT_MISMATCH");
    assert.match(outcome.rejectedCitations[0].reason, /does not substantively match/);
  });

  test("strictly rejects citations referencing a mismatched repository in canonicalUrl", () => {
    const wrongRepoUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_wrong_repo",
        fileId: "ev_1",
        path: "src/auth.ts",
        commitSha,
        canonicalUrl: `https://github.com/evil-org/other-repo/blob/${commitSha}/src/auth.ts#L1-L3`,
        startLine: 1,
        endLine: 3,
        content: "export function verifyToken(token: string) {\n  return token.length > 0;\n}",
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const outcome = validator.validate(["cand_wrong_repo"], wrongRepoUniverse, records);

    assert.equal(outcome.allValid, false);
    assert.equal(outcome.rejectedCitations[0].code, "REPOSITORY_MISMATCH");
  });

  test("strictly rejects citations referencing stale or wrong commit SHA", () => {
    const staleSha = "0".repeat(40);
    const staleUniverse: CandidateSnippet[] = [
      {
        candidateId: "cand_stale_sha",
        fileId: "ev_1",
        path: "src/auth.ts",
        commitSha: staleSha,
        canonicalUrl: `https://github.com/org/repo/blob/${staleSha}/src/auth.ts#L1-L3`,
        startLine: 1,
        endLine: 3,
        content: "export function verifyToken(token: string) {\n  return token.length > 0;\n}",
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const outcome = validator.validate(["cand_stale_sha"], staleUniverse, records);

    assert.equal(outcome.allValid, false);
    assert.equal(outcome.rejectedCitations[0].code, "COMMIT_SHA_MISMATCH");
  });

  test("safely isolates duplicate paths in separate repositories", () => {
    const multiRepoRecords: EvidenceRecord[] = [
      {
        id: "ev_orgA",
        repository: "orgA/service",
        commitSha,
        path: "src/config.ts",
        canonicalUrl: `https://github.com/orgA/service/blob/${commitSha}/src/config.ts`,
        fileType: "source",
        lineCount: 2,
        content: "export const port = 3000;\nexport const env = 'prod';",
        ingestionStatus: "full",
      },
      {
        id: "ev_orgB",
        repository: "orgB/service",
        commitSha,
        path: "src/config.ts",
        canonicalUrl: `https://github.com/orgB/service/blob/${commitSha}/src/config.ts`,
        fileType: "source",
        lineCount: 2,
        content: "export const port = 8080;\nexport const env = 'dev';",
        ingestionStatus: "full",
      },
    ];

    const universe: CandidateSnippet[] = [
      {
        candidateId: "cand_orgA",
        fileId: "ev_orgA",
        path: "src/config.ts",
        commitSha,
        canonicalUrl: `https://github.com/orgA/service/blob/${commitSha}/src/config.ts#L1-L2`,
        startLine: 1,
        endLine: 2,
        content: "export const port = 3000;\nexport const env = 'prod';",
        fileType: "source",
      },
    ];

    const validator = new CitationValidator();
    const outcome = validator.validate(["cand_orgA"], universe, multiRepoRecords);

    assert.equal(outcome.allValid, true);
    assert.equal(outcome.validCount, 1);
    assert.equal(outcome.validCitations[0].repository, "orgA/service");
  });
});

