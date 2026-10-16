import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { EvidenceRanker, applySourceTypeWeight, DEFAULT_SOURCE_WEIGHTS } from "./ranker.js";
import type { ScoredCandidate } from "./interface.js";
import type { LexicalMatch } from "./lexical.js";

describe("Source-Type Weighting and Evidence Ranking Heuristics", () => {
  test("applies correct multiplier per fileType", () => {
    assert.equal(DEFAULT_SOURCE_WEIGHTS.test, 1.5);
    assert.equal(DEFAULT_SOURCE_WEIGHTS.source, 1.2);
    assert.equal(DEFAULT_SOURCE_WEIGHTS.config, 1.0);
    assert.equal(DEFAULT_SOURCE_WEIGHTS.doc, 0.7);

    assert.equal(applySourceTypeWeight(10, "test").weightedScore, 15);
    assert.equal(applySourceTypeWeight(10, "source").weightedScore, 12);
    assert.equal(applySourceTypeWeight(10, "config").weightedScore, 10);
    assert.equal(applySourceTypeWeight(10, "doc").weightedScore, 7);
  });

  test("elevates test files and source code above README documentation for identical base score", () => {
    const rawMatches: LexicalMatch[] = [
      {
        record: {
          id: "ev_doc",
          repository: "org/repo",
          commitSha: "sha1",
          path: "README.md",
          canonicalUrl: "https://github.com/org/repo/blob/sha1/README.md",
          fileType: "doc",
          lineCount: 50,
          content: "OAuth authentication",
          ingestionStatus: "full",
        },
        score: 10.0,
        matchedTerms: ["oauth"],
      },
      {
        record: {
          id: "ev_test",
          repository: "org/repo",
          commitSha: "sha1",
          path: "src/auth.test.ts",
          canonicalUrl: "https://github.com/org/repo/blob/sha1/src/auth.test.ts",
          fileType: "test",
          lineCount: 50,
          content: "OAuth test",
          ingestionStatus: "full",
        },
        score: 10.0,
        matchedTerms: ["oauth"],
      },
      {
        record: {
          id: "ev_src",
          repository: "org/repo",
          commitSha: "sha1",
          path: "src/auth.ts",
          canonicalUrl: "https://github.com/org/repo/blob/sha1/src/auth.ts",
          fileType: "source",
          lineCount: 50,
          content: "OAuth implementation",
          ingestionStatus: "full",
        },
        score: 10.0,
        matchedTerms: ["oauth"],
      },
    ];

    const ranker = new EvidenceRanker();
    const ranked = ranker.rankLexicalMatches(rawMatches);

    // Order should strictly be test (15.0) > source (12.0) > doc (7.0)
    assert.equal(ranked[0].record.fileType, "test");
    assert.equal(ranked[0].weightedScore, 15.0);

    assert.equal(ranked[1].record.fileType, "source");
    assert.equal(ranked[1].weightedScore, 12.0);

    assert.equal(ranked[2].record.fileType, "doc");
    assert.equal(ranked[2].weightedScore, 7.0);
  });

  test("rankCandidates updates candidate score and explanatory rationale", () => {
    const candidates: ScoredCandidate[] = [
      {
        candidate: {
          candidateId: "c1",
          fileId: "f1",
          path: "tests/auth.test.ts",
          commitSha: "sha1",
          canonicalUrl: "https://github.com/org/repo/blob/sha1/tests/auth.test.ts",
          startLine: 1,
          endLine: 20,
          content: "test code",
          fileType: "test",
          score: 8.0,
        },
        score: 8.0,
        matchedTerms: ["auth"],
        rationale: "Matched 'auth'",
      },
    ];

    const ranker = new EvidenceRanker();
    const ranked = ranker.rankCandidates(candidates);

    assert.equal(ranked[0].score, 12.0); // 8 * 1.5
    assert.match(ranked[0].rationale, /Weighted: 1.5x \(test evidence\)/);
  });
});
