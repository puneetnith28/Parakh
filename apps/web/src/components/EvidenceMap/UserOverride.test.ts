import test from "node:test";
import assert from "node:assert/strict";
import { RequirementAssessment } from "@parakh/contracts";

export function applyUserOverride(
  original: RequirementAssessment,
  newStatus: RequirementAssessment["status"],
  notes?: string
): RequirementAssessment {
  const originalStatus = original.originalStatus || original.status;
  const isOverridden = newStatus !== originalStatus || Boolean(notes && notes.trim());

  return {
    ...original,
    status: newStatus,
    manuallyOverridden: isOverridden,
    originalStatus: isOverridden ? originalStatus : undefined,
    userNotes: notes?.trim() || undefined,
  };
}

export function resetUserOverride(item: RequirementAssessment): RequirementAssessment {
  if (!item.originalStatus) return item;
  return {
    ...item,
    status: item.originalStatus,
    manuallyOverridden: false,
    originalStatus: undefined,
    userNotes: undefined,
  };
}

test("applyUserOverride updates status, records original status and tags item as manuallyOverridden", () => {
  const item: RequirementAssessment = {
    requirementId: "req_001",
    requirementText: "Must use React with TypeScript",
    status: "needs_review",
    rationale: "Automated scanner flagged ambiguity in test setup",
    citedCandidateIds: [],
    citations: [],
    nextActions: [],
    confidence: "low",
    manuallyOverridden: false,
  };

  const overridden = applyUserOverride(item, "demonstrated", "Audited manually in person with team");

  assert.equal(overridden.status, "demonstrated");
  assert.equal(overridden.manuallyOverridden, true);
  assert.equal(overridden.originalStatus, "needs_review");
  assert.equal(overridden.userNotes, "Audited manually in person with team");

  // Test reset
  const reset = resetUserOverride(overridden);
  assert.equal(reset.status, "needs_review");
  assert.equal(reset.manuallyOverridden, false);
  assert.equal(reset.originalStatus, undefined);
  assert.equal(reset.userNotes, undefined);
});
