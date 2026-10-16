import test from "node:test";
import assert from "node:assert/strict";
import { RequirementDeduplicator } from "./deduplication.js";
import { Requirement } from "@parakh/contracts";

test("RequirementDeduplicator merges near-duplicate requirements and combines criteria", () => {
  const duplicates: Requirement[] = [
    {
      id: "req_001",
      text: "Build and deploy application with Docker containers",
      category: "devops",
      priority: "preferred",
      acceptanceCriteria: ["Dockerfile provided"],
    },
    {
      id: "req_002",
      text: "Build and deploy application with Docker containerization",
      category: "devops",
      priority: "mandatory",
      acceptanceCriteria: ["Docker Compose configured for multi-container"],
    },
  ];

  const result = RequirementDeduplicator.deduplicate(duplicates);

  assert.equal(result.length, 1);
  assert.equal(result[0].priority, "mandatory"); // mandatory takes precedence
  assert.equal(result[0].acceptanceCriteria?.length, 2); // criteria merged
});

test("RequirementDeduplicator keeps distinct requirements separate", () => {
  const distinct: Requirement[] = [
    {
      id: "req_001",
      text: "Design PostgreSQL relational schema",
      category: "database",
      priority: "mandatory",
    },
    {
      id: "req_002",
      text: "Implement React frontend components",
      category: "frontend",
      priority: "mandatory",
    },
  ];

  const result = RequirementDeduplicator.deduplicate(distinct);
  assert.equal(result.length, 2);
});
