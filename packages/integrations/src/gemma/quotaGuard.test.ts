import test from "node:test";
import assert from "node:assert/strict";
import { QuotaGuard } from "./quotaGuard.js";

test("QuotaGuard throttles requests when spacing is within minDelayMs", async () => {
  const guard = new QuotaGuard({ maxRpm: 60, minDelayMs: 30 });

  const wait1 = await guard.throttle();
  assert.equal(wait1, 0); // First request has no delay

  const wait2 = await guard.throttle();
  assert.ok(wait2 > 0); // Second request within 30ms is paced

  const metrics = guard.getMetrics();
  assert.equal(metrics.totalRequests, 2);
  assert.equal(metrics.throttledRequests, 1);
});

test("QuotaGuard computes exponential backoff for HTTP 429 errors", () => {
  const guard = new QuotaGuard({ maxRetries: 3 });

  // Attempt 0
  const res0 = guard.handleRateLimit(429, 0);
  assert.equal(res0.canRetry, true);
  assert.ok(res0.backoffMs >= 1500 && res0.backoffMs <= 2000);
  assert.ok(res0.advisory.includes("Rate limit encountered"));

  // Attempt 1
  const res1 = guard.handleRateLimit(429, 1);
  assert.equal(res1.canRetry, true);
  assert.ok(res1.backoffMs >= 3000 && res1.backoffMs <= 3500);

  // Attempt with Retry-After header
  const resHeader = guard.handleRateLimit(429, 1, "5");
  assert.equal(resHeader.canRetry, true);
  assert.equal(resHeader.backoffMs, 5000);

  // Exceeded max retries (attempt 3)
  const resExceeded = guard.handleRateLimit(429, 3);
  assert.equal(resExceeded.canRetry, false);
  assert.ok(resExceeded.advisory.includes("quota exceeded"));
});
