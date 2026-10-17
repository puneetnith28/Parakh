import test from "node:test";
import assert from "node:assert/strict";
import { RepositoryIngestionService } from "./ingestion.js";
import { EvidenceRecordSchema } from "@parakh/contracts";

test("RepositoryIngestionService rejects invalid and SSRF repository URLs", async () => {
  const invalidUrls = [
    "http://169.254.169.254/latest/meta-data/",
    "http://localhost:3000/internal",
    "https://gitlab.com/owner/repo",
    "not-a-url",
  ];

  for (const url of invalidUrls) {
    await assert.rejects(
      async () => {
        await RepositoryIngestionService.ingest(url);
      },
      (err: any) => {
        assert.ok(err.message.length > 0);
        return true;
      }
    );
  }
});

test("RepositoryIngestionService pins 40-character commit SHA and produces valid EvidenceRecords with custom client", async () => {
  const mockSha = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
  const mockClient = {
    async resolveRepoMetadata(owner: string, repo: string) {
      return {
        owner,
        repo,
        fullName: `${owner}/${repo}`,
        defaultBranch: "main",
        isPrivate: false,
      };
    },
    async resolvePinnedRevision(owner: string, repo: string, ref: string) {
      return {
        commitSha: mockSha,
        ref,
        resolvedAt: new Date().toISOString(),
      };
    },
    async fetchTree(owner: string, repo: string, commitSha: string) {
      return {
        sha: commitSha,
        truncated: false,
        tree: [
          { path: "src/index.ts", mode: "100644", type: "blob", sha: "blob1", size: 120 },
          { path: "test/index.test.ts", mode: "100644", type: "blob", sha: "blob2", size: 240 },
          { path: "README.md", mode: "100644", type: "blob", sha: "blob3", size: 50 },
        ],
      };
    },
    async fetchBlobContent(owner: string, repo: string, fileSha: string) {
      return "export const hello = 'world';\n";
    },
  };

  const result = await RepositoryIngestionService.ingest("https://github.com/mock-org/mock-repo", {
    client: mockClient as any,
  });

  assert.equal(result.owner, "mock-org");
  assert.equal(result.repo, "mock-repo");
  assert.equal(result.commitSha, mockSha);
  assert.equal(result.records.length, 3);

  for (const record of result.records) {
    const validated = EvidenceRecordSchema.parse(record);
    assert.equal(validated.commitSha, mockSha);
    assert.ok(validated.canonicalUrl.includes(mockSha));
    assert.ok(["source", "test", "doc", "config"].includes(validated.fileType));
  }
});

