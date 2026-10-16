import test from "node:test";
import assert from "node:assert/strict";
import { calculatePercentages, CoverageData } from "./CoverageSummary.tsx";

test("calculatePercentages accurately computes rounded percentages", () => {
  const sample1: CoverageData = {
    total: 10,
    demonstrated: 5,
    partiallyDemonstrated: 2,
    notDemonstrated: 2,
    needsReview: 1,
  };

  const p1 = calculatePercentages(sample1);
  assert.equal(p1.demonstratedPct, 50);
  assert.equal(p1.partiallyDemonstratedPct, 20);
  assert.equal(p1.notDemonstratedPct, 20);
  assert.equal(p1.needsReviewPct, 10);
});

test("calculatePercentages handles 0 total without division by zero errors", () => {
  const sample0: CoverageData = {
    total: 0,
    demonstrated: 0,
    partiallyDemonstrated: 0,
    notDemonstrated: 0,
    needsReview: 0,
  };

  const p0 = calculatePercentages(sample0);
  assert.equal(p0.demonstratedPct, 0);
  assert.equal(p0.partiallyDemonstratedPct, 0);
  assert.equal(p0.notDemonstratedPct, 0);
  assert.equal(p0.needsReviewPct, 0);
});

test("calculatePercentages handles uneven distributions and rounding", () => {
  const sampleUneven: CoverageData = {
    total: 3,
    demonstrated: 1,
    partiallyDemonstrated: 1,
    notDemonstrated: 1,
    needsReview: 0,
  };

  const p = calculatePercentages(sampleUneven);
  assert.equal(p.demonstratedPct, 33);
  assert.equal(p.partiallyDemonstratedPct, 33);
  assert.equal(p.notDemonstratedPct, 33);
  assert.equal(p.needsReviewPct, 0);
});
