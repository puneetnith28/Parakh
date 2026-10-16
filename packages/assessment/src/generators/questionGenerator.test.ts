import test from "node:test";
import assert from "node:assert/strict";
import { RequirementAssessment } from "@parakh/contracts";
import {
  generateClarificationQuestions,
  formatQuestionsMarkdown,
} from "./questionGenerator.js";

test("generateClarificationQuestions formulates questions for gaps and ambiguous items", () => {
  const sample: RequirementAssessment[] = [
    {
      requirementId: "req_001",
      requirementText: "Must support OAuth 2.0 and PKCE",
      status: "demonstrated",
      rationale: "Found pkce utils in auth/",
      citedCandidateIds: ["c1"],
      citations: [],
      nextActions: [],
      confidence: "high",
      manuallyOverridden: false,
    },
    {
      requirementId: "req_002",
      requirementText: "Must integrate with legacy enterprise billing SOAP service",
      status: "not_demonstrated",
      rationale: "No SOAP clients or WSDL files located in codebase",
      citedCandidateIds: [],
      citations: [],
      nextActions: [],
      confidence: "medium",
      manuallyOverridden: false,
    },
    {
      requirementId: "req_003",
      requirementText: "Must process 50k events per second with low latency",
      status: "needs_review",
      rationale: "Citation validation failed for performance benchmark claims",
      citedCandidateIds: [],
      citations: [],
      nextActions: [],
      confidence: "low",
      manuallyOverridden: false,
    },
  ];

  const questions = generateClarificationQuestions(sample);

  // Demonstrated item should not generate a clarification question
  assert.equal(questions.some((q) => q.requirementId === "req_001"), false);

  // not_demonstrated item should generate an environment/integration question
  const q2 = questions.find((q) => q.requirementId === "req_002");
  assert.ok(q2);
  assert.equal(q2?.topic, "Environment & Integrations");

  // needs_review item should generate architecture & verification question
  const q3 = questions.find((q) => q.requirementId === "req_003");
  assert.ok(q3);
  assert.equal(q3?.topic, "Architecture & Verification Scope");

  // Markdown formatting contains questions
  const markdown = formatQuestionsMarkdown(questions);
  assert.ok(markdown.includes("SOAP service"));
  assert.ok(markdown.includes("50k events per second"));
});
