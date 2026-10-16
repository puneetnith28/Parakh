import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CandidateSelector } from "@parakh/assessment";
import { buildEvidenceRecord } from "@parakh/evidence";
import type { EvidenceRecord, Requirement } from "@parakh/contracts";

describe("Retrieval Quality Benchmark Evaluation Suite", () => {
  const commitSha = "4f738b55239a031a0e4c6c0e816a2d1f4d924cb5";
  const repoDir = path.resolve(process.cwd(), "tests/fixtures/sample-repo");

  // Helper to recursively collect files
  function getFiles(dir: string, baseDir: string = dir): string[] {
    const results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...getFiles(fullPath, baseDir));
      } else {
        results.push(path.relative(baseDir, fullPath).replace(/\\/g, "/"));
      }
    }
    return results;
  }

  const relativePaths = getFiles(repoDir);
  const records: EvidenceRecord[] = relativePaths.map((relPath) => {
    const content = fs.readFileSync(path.join(repoDir, relPath), "utf-8");
    return buildEvidenceRecord({
      owner: "sample",
      repo: "microservice",
      commitSha,
      path: relPath,
      rawContent: content,
    });
  });

  const repoIndex = {
    repository: "sample/microservice",
    commitSha,
    records,
    totalFiles: records.length,
    indexedAt: new Date().toISOString(),
  };

  const benchmarkCases: Array<{
    requirement: Requirement;
    expectedPaths: string[];
  }> = [
    {
      requirement: {
        id: "bench_graphql",
        text: "GraphQL API schema definitions and query resolvers",
        category: "backend",
        priority: "mandatory",
      },
      expectedPaths: ["src/graphql/resolvers.ts", "src/graphql/schema.graphql"],
    },
    {
      requirement: {
        id: "bench_jwt",
        text: "JWT authentication token verification and security tests",
        category: "security",
        priority: "mandatory",
      },
      expectedPaths: ["tests/auth.test.ts", "src/auth/jwt.ts"],
    },
    {
      requirement: {
        id: "bench_postgres",
        text: "PostgreSQL relational database client and queries",
        category: "database",
        priority: "mandatory",
      },
      expectedPaths: ["src/db/postgres.ts"],
    },
    {
      requirement: {
        id: "bench_docker",
        text: "Docker container deployment configuration",
        category: "devops",
        priority: "mandatory",
      },
      expectedPaths: ["Dockerfile"],
    },
  ];

  test("achieves high Hit-Rate and Mean Reciprocal Rank (MRR >= 0.8)", () => {
    const selector = new CandidateSelector({ maxCandidates: 5 });
    let reciprocalRankSum = 0;
    let hitCount = 0;

    for (const bench of benchmarkCases) {
      const universe = selector.selectCandidates(bench.requirement, repoIndex);
      assert.ok(universe.candidates.length > 0, `No candidates returned for ${bench.requirement.id}`);

      let foundRank = -1;
      for (let i = 0; i < universe.candidates.length; i++) {
        if (bench.expectedPaths.includes(universe.candidates[i].path)) {
          foundRank = i + 1; // 1-indexed rank
          break;
        }
      }

      if (foundRank === 1) {
        hitCount++;
      }

      if (foundRank > 0) {
        reciprocalRankSum += 1.0 / foundRank;
      }
    }

    const hitRateAt1 = hitCount / benchmarkCases.length;
    const mrr = reciprocalRankSum / benchmarkCases.length;

    console.log(`[Benchmark Results] Hit-Rate@1: ${(hitRateAt1 * 100).toFixed(1)}%, MRR: ${mrr.toFixed(3)}`);

    assert.ok(hitRateAt1 >= 0.75, `Expected Hit-Rate@1 >= 0.75, got ${hitRateAt1}`);
    assert.ok(mrr >= 0.8, `Expected MRR >= 0.8, got ${mrr}`);
  });
});
