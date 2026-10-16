import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LexicalRetriever, tokenizeText } from "./lexical.js";
import type { EvidenceRecord, Requirement } from "@parakh/contracts";

describe("Lexical Keyword Retrieval Engine", () => {
  test("tokenizes camelCase, snake_case, and technical terminology", () => {
    const tokens = tokenizeText("Implement OAuth2 authentication using PostgreSQL and JWT tokens");
    assert.ok(tokens.includes("oauth2"));
    assert.ok(tokens.includes("authentication"));
    assert.ok(tokens.includes("postgresql"));
    assert.ok(tokens.includes("jwt"));
    assert.ok(tokens.includes("tokens"));
    assert.ok(!tokens.includes("and"));
    assert.ok(!tokens.includes("using"));
  });

  test("ranks relevant source files higher when query terms match path and content", () => {
    const records: EvidenceRecord[] = [
      {
        id: "ev_1",
        repository: "org/repo",
        commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
        path: "src/auth/oauth.ts",
        canonicalUrl: "https://github.com/org/repo/blob/4f738b55239a031a0e4c6c0e816a2d1f4d924cb5/src/auth/oauth.ts",
        fileType: "source",
        lineCount: 40,
        content: "export class OAuthService {\n  verifyJwt(token: string) {}\n}",
        ingestionStatus: "full",
      },
      {
        id: "ev_2",
        repository: "org/repo",
        commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
        path: "src/ui/Button.tsx",
        canonicalUrl: "https://github.com/org/repo/blob/4f738b55239a031a0e4c6c0e816a2d1f4d924cb5/src/ui/Button.tsx",
        fileType: "source",
        lineCount: 15,
        content: "export const Button = () => <button>Click</button>;",
        ingestionStatus: "full",
      },
      {
        id: "ev_3",
        repository: "org/repo",
        commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
        path: "README.md",
        canonicalUrl: "https://github.com/org/repo/blob/4f738b55239a031a0e4c6c0e816a2d1f4d924cb5/README.md",
        fileType: "doc",
        lineCount: 10,
        content: "# Repo\nWe use OAuth authentication for security.",
        ingestionStatus: "full",
      },
    ];

    const retriever = new LexicalRetriever();
    const matches = retriever.searchRecords("OAuth JWT authentication", records);

    assert.ok(matches.length >= 2);
    // OAuth service should be ranked first because of path match + content matches
    assert.equal(matches[0].record.path, "src/auth/oauth.ts");
    assert.ok(matches[0].matchedTerms.includes("oauth"));
    assert.ok(matches[0].matchedTerms.includes("jwt"));
  });

  test("implements IEvidenceRetriever retrieveEvidence interface", async () => {
    const requirement: Requirement = {
      id: "req_test_1",
      text: "Support Docker containerized deployment",
      category: "devops",
      priority: "mandatory",
    };

    const records: EvidenceRecord[] = [
      {
        id: "ev_docker",
        repository: "org/repo",
        commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
        path: "Dockerfile",
        canonicalUrl: "https://github.com/org/repo/blob/4f738b55239a031a0e4c6c0e816a2d1f4d924cb5/Dockerfile",
        fileType: "config",
        lineCount: 20,
        content: "FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nCMD [\"node\", \"server.js\"]",
        ingestionStatus: "full",
      },
    ];

    const retriever = new LexicalRetriever();
    const result = await retriever.retrieveEvidence(requirement, {
      repository: "org/repo",
      commitSha: "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5",
      records,
      totalFiles: 1,
      indexedAt: new Date().toISOString(),
    });

    assert.equal(result.requirementId, "req_test_1");
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].candidate.path, "Dockerfile");
    assert.ok(result.candidates[0].score > 0);
  });
});
