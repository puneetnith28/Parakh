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
});
