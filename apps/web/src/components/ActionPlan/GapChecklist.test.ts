import test from "node:test";
import assert from "node:assert/strict";
import { RequirementAssessment } from "@parakh/contracts";
import { generateGapActions, GapActionItem } from "./GapChecklist.tsx";

test("generateGapActions extracts nextActions and synthesizes gap items", () => {
  const sampleAssessments: RequirementAssessment[] = [
    {
      requirementId: "req_001",
      requirementText: "Must use React with TypeScript",
      status: "demonstrated",
      rationale: "Found tsx files in apps/web",
      citedCandidateIds: ["c1"],
      citations: [],
      nextActions: [],
      confidence: "high",
      manuallyOverridden: false,
    },
    {
      requirementId: "req_002",
      requirementText: "Must support Redis cache",
      status: "partially_demonstrated",
      rationale: "Redis dependency in package.json but no usage",
      citedCandidateIds: [],
      citations: [],
      nextActions: ["Add Redis client connection and cache helper"],
      confidence: "medium",
      manuallyOverridden: false,
    },
    {
      requirementId: "req_003",
      requirementText: "Must deploy on AWS ECS",
      status: "not_demonstrated",
      rationale: "No ECS task definitions or cloudformation files found",
      citedCandidateIds: [],
      citations: [],
      nextActions: [],
      confidence: "medium",
      manuallyOverridden: false,
    },
  ];

  const actions = generateGapActions(sampleAssessments);

  // req_001 is demonstrated, so 0 gap actions
  assert.equal(actions.some((a: GapActionItem) => a.requirementId === "req_001"), false);

  // req_002 has model provided nextAction
  const req2Action = actions.find((a: GapActionItem) => a.requirementId === "req_002");
  assert.ok(req2Action);
  assert.equal(req2Action?.actionText, "Add Redis client connection and cache helper");

  // req_003 has synthesized alternative repo & client clarification actions
  const req3Actions = actions.filter((a: GapActionItem) => a.requirementId === "req_003");
  assert.equal(req3Actions.length, 2);
  assert.equal(req3Actions.some((a: GapActionItem) => a.category === "alternative_repo"), true);
  assert.equal(req3Actions.some((a: GapActionItem) => a.category === "client_clarification"), true);
});
