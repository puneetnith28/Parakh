import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RequirementDeduplicator } from "../../packages/assessment/src/deduplication.js";
import type { Requirement } from "@parakh/contracts";

describe("Unit: RequirementDeduplicator Suite", () => {
  it("returns original array unchanged when length <= 1", () => {
    const single: Requirement[] = [
      {
        id: "req-1",
        text: "Fastify REST API",
        category: "backend",
        priority: "mandatory",
      },
    ];
    assert.deepEqual(RequirementDeduplicator.deduplicate([]), []);
    assert.deepEqual(RequirementDeduplicator.deduplicate(single), single);
  });

  it("merges near-duplicate requirements and prioritizes mandatory status", () => {
    const reqs: Requirement[] = [
      {
        id: "req-1",
        text: "Implement Fastify REST API endpoints with schema validation",
        category: "general",
        priority: "preferred",
        acceptanceCriteria: ["Use Zod"],
      },
      {
        id: "req-2",
        text: "Implement Fastify REST API endpoints with schema validation and error handlers",
        category: "backend",
        priority: "mandatory",
        acceptanceCriteria: ["Centralized error handler"],
      },
    ];

    const deduplicated = RequirementDeduplicator.deduplicate(reqs);
    assert.equal(deduplicated.length, 1);
    assert.equal(deduplicated[0].priority, "mandatory");
    assert.equal(deduplicated[0].category, "backend");
    assert.ok(deduplicated[0].acceptanceCriteria?.includes("Use Zod"));
    assert.ok(deduplicated[0].acceptanceCriteria?.includes("Centralized error handler"));
  });

  it("keeps distinct requirements separated", () => {
    const reqs: Requirement[] = [
      {
        id: "req-1",
        text: "Implement Fastify REST API endpoints",
        category: "backend",
        priority: "mandatory",
      },
      {
        id: "req-2",
        text: "Create responsive React dashboard with dark mode",
        category: "frontend",
        priority: "preferred",
      },
    ];

    const deduplicated = RequirementDeduplicator.deduplicate(reqs);
    assert.equal(deduplicated.length, 2);
  });
});
