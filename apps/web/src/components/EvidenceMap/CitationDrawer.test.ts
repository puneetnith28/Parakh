import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildGitHubCommitPermalink,
  formatLineRangeText,
} from "./CitationDrawer.tsx";
import type { Citation } from "@parakh/contracts";

describe("CitationDrawer and GitHub Commit Permalink Engine", () => {
  const sampleCitation: Citation = {
    candidateId: "cand_001",
    repository: "https://github.com/facebook/react",
    commitSha: "b455b5528e578c7407dd82a0b411d332d9d9bbad",
    path: "packages/react/src/React.js",
    canonicalUrl: "https://github.com/facebook/react/blob/b455b5528e578c7407dd82a0b411d332d9d9bbad/packages/react/src/React.js",
    startLine: 10,
    endLine: 45,
    snippet: "export default React;",
    evidenceType: "source",
  };

  test("buildGitHubCommitPermalink builds exact line-anchored commit permalink", () => {
    const url = buildGitHubCommitPermalink(sampleCitation);
    assert.equal(
      url,
      "https://github.com/facebook/react/blob/b455b5528e578c7407dd82a0b411d332d9d9bbad/packages/react/src/React.js#L10-L45"
    );
  });

  test("buildGitHubCommitPermalink handles single line citations", () => {
    const singleLineCitation: Citation = {
      ...sampleCitation,
      startLine: 25,
      endLine: undefined,
    };
    const url = buildGitHubCommitPermalink(singleLineCitation);
    assert.equal(
      url,
      "https://github.com/facebook/react/blob/b455b5528e578c7407dd82a0b411d332d9d9bbad/packages/react/src/React.js#L25"
    );
  });

  test("buildGitHubCommitPermalink preserves existing line anchors without duplication", () => {
    const alreadyAnchoredCitation: Citation = {
      ...sampleCitation,
      canonicalUrl: "https://github.com/facebook/react/blob/sha/React.js#L10-L45",
    };
    const url = buildGitHubCommitPermalink(alreadyAnchoredCitation);
    assert.equal(url, "https://github.com/facebook/react/blob/sha/React.js#L10-L45");
  });

  test("formatLineRangeText formats ranges and single lines correctly", () => {
    assert.equal(formatLineRangeText(10, 35), "L10-L35");
    assert.equal(formatLineRangeText(12), "L12");
    assert.equal(formatLineRangeText(undefined, undefined), null);
  });
});
