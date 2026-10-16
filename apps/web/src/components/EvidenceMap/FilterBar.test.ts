import test from "node:test";
import assert from "node:assert/strict";
import { RequirementAssessment } from "@parakh/contracts";

export function filterAssessments(
  items: RequirementAssessment[],
  query: string,
  statusFilter: string,
  categoryFilter: string
): RequirementAssessment[] {
  return items.filter((item) => {
    // Status filter
    if (statusFilter === "demonstrated" && item.status !== "demonstrated") return false;
    if (statusFilter === "partially_demonstrated" && item.status !== "partially_demonstrated") return false;
    if (statusFilter === "not_demonstrated" && item.status !== "not_demonstrated") return false;
    if (statusFilter === "needs_review" && item.status !== "needs_review") return false;
    if (statusFilter === "gaps_only" && item.status !== "partially_demonstrated" && item.status !== "not_demonstrated") {
      return false;
    }

    // Category filter
    if (categoryFilter !== "all" && (item as any).category && (item as any).category !== categoryFilter) {
      return false;
    }

    // Keyword search
    if (query.trim()) {
      const q = query.toLowerCase();
      const matchText = item.requirementText.toLowerCase().includes(q);
      const matchRationale = item.rationale.toLowerCase().includes(q);
      const matchCitations = item.citations.some((c) => c.path.toLowerCase().includes(q));
      if (!matchText && !matchRationale && !matchCitations) return false;
    }

    return true;
  });
}

test("filterAssessments correctly filters by status chip and gaps_only", () => {
  const sample: RequirementAssessment[] = [
    {
      requirementId: "req_001",
      requirementText: "Must have JWT authentication",
      status: "demonstrated",
      rationale: "Found jwt signing in auth.ts",
      citedCandidateIds: ["cand_001"],
      citations: [
        {
          candidateId: "cand_001",
          repository: "owner/repo",
          commitSha: "a".repeat(40),
          path: "src/auth.ts",
          canonicalUrl: "https://github.com/owner/repo/blob/master/src/auth.ts",
          evidenceType: "source_code",
          snippet: "jwt.sign()",
        },
      ],
      nextActions: [],
      confidence: "high",
      manuallyOverridden: false,
    },
    {
      requirementId: "req_002",
      requirementText: "Must support Postgres database",
      status: "partially_demonstrated",
      rationale: "Docker compose has postgres but no migrations",
      citedCandidateIds: [],
      citations: [],
      nextActions: ["Add migrations"],
      confidence: "medium",
      manuallyOverridden: false,
    },
    {
      requirementId: "req_003",
      requirementText: "Must have Kubernetes helm chart",
      status: "not_demonstrated",
      rationale: "No helm or k8s manifests found",
      citedCandidateIds: [],
      citations: [],
      nextActions: ["Create helm chart"],
      confidence: "medium",
      manuallyOverridden: false,
    },
  ];

  // Test 'all'
  assert.equal(filterAssessments(sample, "", "all", "all").length, 3);

  // Test 'demonstrated'
  const demonstrated = filterAssessments(sample, "", "demonstrated", "all");
  assert.equal(demonstrated.length, 1);
  assert.equal(demonstrated[0].requirementId, "req_001");

  // Test 'gaps_only'
  const gaps = filterAssessments(sample, "", "gaps_only", "all");
  assert.equal(gaps.length, 2);
  assert.deepEqual(gaps.map((g) => g.requirementId), ["req_002", "req_003"]);

  // Test search query
  const searchJwt = filterAssessments(sample, "jwt", "all", "all");
  assert.equal(searchJwt.length, 1);
  assert.equal(searchJwt[0].requirementId, "req_001");

  // Test search matching citation path
  const searchAuth = filterAssessments(sample, "auth.ts", "all", "all");
  assert.equal(searchAuth.length, 1);
  assert.equal(searchAuth[0].requirementId, "req_001");
});
