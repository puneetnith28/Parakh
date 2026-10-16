import test from "node:test";
import assert from "node:assert/strict";
import { AssessmentReport } from "@parakh/contracts";
import { getStorage, setStorage, MemoryReportStorage } from "./index.js";

test("MemoryReportStorage operates 100% statelessly without MONGODB_URI", async () => {
  setStorage(new MemoryReportStorage());
  const storage = getStorage();

  assert.equal(storage.getMode(), "memory");
  assert.equal(storage.isPersistent(), false);

  const sampleReport: AssessmentReport = {
    id: "rep_mem_001",
    opportunityId: "opp_mem_001",
    repositoryUrl: "https://github.com/sample/repo",
    resolvedCommitSha: "1".repeat(40),
    status: "completed",
    assessments: [],
    coverageSummary: {
      total: 0,
      demonstrated: 0,
      partiallyDemonstrated: 0,
      notDemonstrated: 0,
      needsReview: 0,
    },
    scannedFilesCount: 10,
    skippedFilesCount: 2,
    createdAt: new Date().toISOString(),
  };

  const viewToken = "sec_token_abc123";

  // 1. Save report
  await storage.saveReport(sampleReport, viewToken);

  // 2. Fetch by valid token
  const retrieved = await storage.getReportByToken("rep_mem_001", viewToken);
  assert.ok(retrieved);
  assert.equal(retrieved?.id, "rep_mem_001");

  // 3. Reject invalid token
  const rejected = await storage.getReportByToken("rep_mem_001", "wrong_token");
  assert.equal(rejected, null);

  // 4. Delete report with valid token
  const deleted = await storage.deleteReport("rep_mem_001", viewToken);
  assert.equal(deleted, true);

  // 5. Verify deleted
  const afterDelete = await storage.getReportById("rep_mem_001");
  assert.equal(afterDelete, null);
});
