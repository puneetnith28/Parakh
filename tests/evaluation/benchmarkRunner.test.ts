import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BenchmarkRunner } from "./benchmarkRunner.js";

describe("Deterministic Benchmark Evaluation Suite", () => {
  it("executes all 10 benchmark scenarios with 100% pass rate", async () => {
    const runner = new BenchmarkRunner();
    const summary = await runner.runAll();

    assert.equal(summary.total, 10);
    assert.equal(summary.passed, 10);
    assert.equal(summary.failed, 0);
  });
});
