import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildEvidenceRecord,
  buildGitHubPermalink,
  buildBatchEvidenceRecords,
} from "./recordBuilder.js";

describe("Evidence Record Construction & Permalink Verification", () => {
  const mockCommitSha = "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5";

  test("generates exact GitHub permalinks with line ranges", () => {
    const fileUrl = buildGitHubPermalink("facebook", "react", mockCommitSha, "packages/react/index.js");
    assert.equal(
      fileUrl,
      `https://github.com/facebook/react/blob/${mockCommitSha}/packages/react/index.js`
    );

    const singleLineUrl = buildGitHubPermalink("facebook", "react", mockCommitSha, "src/index.ts", 42, 42);
    assert.equal(
      singleLineUrl,
      `https://github.com/facebook/react/blob/${mockCommitSha}/src/index.ts#L42`
    );

    const rangeUrl = buildGitHubPermalink("facebook", "react", mockCommitSha, "src/index.ts", 10, 25);
    assert.equal(
      rangeUrl,
      `https://github.com/facebook/react/blob/${mockCommitSha}/src/index.ts#L10-L25`
    );
  });

  test("builds validated EvidenceRecord with normalized lines and metadata", () => {
    const rawCode = "import { z } from 'zod';\r\n\r\nexport const schema = z.string();\r\n";
    const record = buildEvidenceRecord({
      owner: "myorg",
      repo: "myrepo",
      commitSha: mockCommitSha,
      path: "src/schemas.ts",
      rawContent: rawCode,
    });

    assert.ok(record.id.startsWith("ev_"));
    assert.equal(record.repository, "myorg/myrepo");
    assert.equal(record.commitSha, mockCommitSha);
    assert.equal(record.fileType, "source");
    assert.equal(record.language, "TypeScript");
    assert.equal(record.lineCount, 4); // lines 1, 2, 3, and trailing empty line 4
    assert.ok(!record.content.includes("\r"));
    assert.equal(
      record.canonicalUrl,
      `https://github.com/myorg/myrepo/blob/${mockCommitSha}/src/schemas.ts`
    );
  });

  test("builds batch records cleanly", () => {
    const records = buildBatchEvidenceRecords("org", "repo", mockCommitSha, [
      { path: "README.md", sha: "s1", content: "# Title\nDoc body", byteSize: 15, status: "full" },
      { path: "src/app.test.ts", sha: "s2", content: "test('ok', ()=>{})", byteSize: 20, status: "full" },
    ]);

    assert.equal(records.length, 2);
    assert.equal(records[0].fileType, "doc");
    assert.equal(records[1].fileType, "test");
  });
});
