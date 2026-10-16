import test from "node:test";
import assert from "node:assert/strict";
import { ensureDatabaseIndexes, REQUIRED_DATABASE_INDEXES } from "./indexes.js";

test("ensureDatabaseIndexes defines required performance and TTL indexes", async () => {
  const result = await ensureDatabaseIndexes();

  assert.equal(result.count, 7);
  assert.equal(result.indexes.length, 7);

  // Check TTL index
  const ttlIndex = REQUIRED_DATABASE_INDEXES.find(
    (idx) => idx.options?.expireAfterSeconds === 0
  );
  assert.ok(ttlIndex);
  assert.equal(ttlIndex?.collection, "assessment_reports");
  assert.deepEqual(ttlIndex?.fields, { expiresAt: 1 });

  // Check unique reportId index
  const reportUniqueIndex = REQUIRED_DATABASE_INDEXES.find(
    (idx) => idx.collection === "assessment_reports" && idx.options?.unique === true
  );
  assert.ok(reportUniqueIndex);
  assert.deepEqual(reportUniqueIndex?.fields, { reportId: 1 });

  // Check compound runId + status index
  const compoundRunIndex = REQUIRED_DATABASE_INDEXES.find(
    (idx) => idx.collection === "analysis_runs" && idx.fields.runId === 1 && idx.fields.status === 1
  );
  assert.ok(compoundRunIndex);
});
