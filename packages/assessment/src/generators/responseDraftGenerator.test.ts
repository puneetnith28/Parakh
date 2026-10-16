import test from "node:test";
import assert from "node:assert/strict";
import { RequirementAssessment } from "@parakh/contracts";
import { generateProposalDraft } from "./responseDraftGenerator.js";

test("generateProposalDraft ensures no unverified claims appear as positive affirmations", () => {
  const sample: RequirementAssessment[] = [
    {
      requirementId: "req_001",
      requirementText: "Must build responsive React UI",
      status: "demonstrated",
      rationale: "Found React 18 with Tailwind CSS in apps/web",
      citedCandidateIds: ["cand_001"],
      citations: [
        {
          candidateId: "cand_001",
          repository: "owner/repo",
          commitSha: "f".repeat(40),
          path: "apps/web/src/App.tsx",
          canonicalUrl: "https://github.com/owner/repo/blob/master/apps/web/src/App.tsx",
          evidenceType: "source_code",
          snippet: "export default function App() {}",
        },
      ],
      nextActions: [],
      confidence: "high",
      manuallyOverridden: false,
    },
    {
      requirementId: "req_002",
      requirementText: "Must implement advanced AI agent planning with Mastra",
      status: "not_demonstrated",
      rationale: "No Mastra agents or planning workflows found in repo",
      citedCandidateIds: [],
      citations: [],
      nextActions: [],
      confidence: "medium",
      manuallyOverridden: false,
    },
    {
      requirementId: "req_003",
      requirementText: "Must configure Kafka message queues",
      status: "needs_review",
      rationale: "Kafka mention in comments only",
      citedCandidateIds: [],
      citations: [],
      nextActions: [],
      confidence: "low",
      manuallyOverridden: false,
    },
  ];

  const draft = generateProposalDraft(sample, "https://github.com/owner/repo", "Enterprise Web App");

  // Mandatory review disclaimer must be present
  assert.ok(draft.disclaimer.includes("ADVISORY DISCLAIMER"));
  assert.ok(draft.fullDraftText.includes("ADVISORY DISCLAIMER"));

  // Only req_001 should be in verified capabilities
  assert.equal(draft.demonstratedCapabilities.length, 1);
  assert.equal(draft.demonstratedCapabilities[0].requirementText, "Must build responsive React UI");
  assert.ok(draft.demonstratedCapabilities[0].evidenceProof.includes("App.tsx"));

  // Unverified items (req_002, req_003) must NOT be in demonstrated capabilities
  const hasMastraAsDemonstrated = draft.demonstratedCapabilities.some((d) =>
    d.requirementText.includes("Mastra")
  );
  assert.equal(hasMastraAsDemonstrated, false);

  const hasKafkaAsDemonstrated = draft.demonstratedCapabilities.some((d) =>
    d.requirementText.includes("Kafka")
  );
  assert.equal(hasKafkaAsDemonstrated, false);

  // Unverified items must be framed as discussion/collaboration topics
  assert.equal(draft.collaborationTopics.length, 2);
  assert.ok(draft.collaborationTopics.some((t) => t.requirementText.includes("Mastra")));
  assert.ok(draft.collaborationTopics.some((t) => t.requirementText.includes("Kafka")));
});
