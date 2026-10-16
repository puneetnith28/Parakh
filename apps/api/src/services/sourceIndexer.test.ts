import test from "node:test";
import assert from "node:assert/strict";
import { SourceIndexer } from "./sourceIndexer.js";
import { Requirement } from "@parakh/contracts";

test("SourceIndexer locates requirement substring in raw opportunity brief", () => {
  const briefText = `Project Scope:
We require the candidate to implement PostgreSQL database migrations and schemas.
Furthermore, the frontend must be written in React with Tailwind CSS.`;

  const requirements: Requirement[] = [
    {
      id: "req_001",
      text: "Implement PostgreSQL database migrations",
      category: "database",
      priority: "mandatory",
    },
    {
      id: "req_002",
      text: "Write frontend in React with Tailwind CSS",
      category: "frontend",
      priority: "mandatory",
    },
  ];

  const indexed = SourceIndexer.indexRequirements(briefText, requirements, 1);

  assert.equal(indexed.length, 2);

  // Requirement 1 verification
  assert.ok(indexed[0].sourceLocation?.charStart !== undefined);
  assert.ok(indexed[0].sourceLocation?.charEnd !== undefined);
  const snippet1 = indexed[0].sourceLocation?.sourceSnippet || "";
  assert.match(snippet1, /PostgreSQL database migrations/);

  // Requirement 2 verification
  assert.ok(indexed[1].sourceLocation?.charStart !== undefined);
  const snippet2 = indexed[1].sourceLocation?.sourceSnippet || "";
  assert.match(snippet2, /React with Tailwind/);
});
