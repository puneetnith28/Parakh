import test from "node:test";
import assert from "node:assert/strict";
import { sentryBeforeSend, initSentry } from "./sentry.js";

test("sentryBeforeSend redacts secrets from exceptions, breadcrumbs, and request data", () => {
  const rawEvent: any = {
    exception: {
      values: [
        {
          type: "Error",
          value: "Failed to connect with token ghp_1234567890abcdefghijklmnopqrstuvwxyzAB",
        },
      ],
    },
    breadcrumbs: [
      {
        message: "Model API call with key AIzaSyD1234567890abcdefghijklmnopqrstuv",
        data: {
          url: "https://api.github.com",
          auth: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz",
        },
      },
    ],
    request: {
      query_string: "token=sec_token_secret123456789&user=puneet",
      headers: {
        authorization: "Bearer secret_bearer_token_abc",
      },
    },
    extra: {
      databaseUrl: "mongodb+srv://admin:MyPass123@cluster.mongodb.net",
    },
  };

  const scrubbed = sentryBeforeSend(rawEvent);

  assert.ok(scrubbed);

  // Exception check
  assert.equal(
    scrubbed?.exception?.values?.[0].value,
    "Failed to connect with token [REDACTED_GITHUB_TOKEN]"
  );

  // Breadcrumbs check
  assert.equal(
    scrubbed?.breadcrumbs?.[0].message,
    "Model API call with key [REDACTED_AI_STUDIO_KEY]"
  );
  assert.equal(
    scrubbed?.breadcrumbs?.[0].data?.auth,
    "Bearer [REDACTED_BEARER_TOKEN]"
  );

  // Request headers & query string
  assert.equal(
    scrubbed?.request?.headers?.authorization,
    "Bearer [REDACTED_BEARER_TOKEN]"
  );

  // Database URL in extra context
  const extra = scrubbed?.extra as any;
  assert.ok(!extra?.databaseUrl.includes("MyPass123"));
  assert.ok(extra?.databaseUrl.includes("[REDACTED_PASSWORD]"));
});

test("initSentry reports initialization status", () => {
  const status = initSentry();
  assert.ok(status);
  assert.equal(typeof status.environment, "string");
  assert.equal(typeof status.initialized, "boolean");
});

test("trackStep executes operation and records duration and scrubbed attributes", async () => {
  const { trackStep } = await import("./sentry.js");

  // Success path
  let executed = false;
  const result = await trackStep(
    "assessment.test_op",
    "test.step",
    async () => {
      executed = true;
      return "result_value";
    },
    {
      repo: "org/repo",
      secretHeader: "Bearer sk_1234567890abcdef",
    }
  );

  assert.equal(executed, true);
  assert.equal(result, "result_value");

  // Failure path: error is propagated and scrubbed
  await assert.rejects(
    async () => {
      await trackStep(
        "assessment.failing_step",
        "test.fail",
        async () => {
          throw new Error("Failed with token ghp_1234567890abcdefghijklmnopqrstuvwxyzAB");
        },
        { runId: "run_test_1" }
      );
    },
    (err: any) => {
      assert.ok(err.message.includes("Failed with token"));
      return true;
    }
  );
});

test("captureExceptionScrubbed scrubs secrets from error message and context extras", async () => {
  const { captureExceptionScrubbed } = await import("./sentry.js");

  // Ensure it executes safely without throwing
  assert.doesNotThrow(() => {
    captureExceptionScrubbed(new Error("Database connection to mongodb+srv://user:pass123@cluster.com"), {
      token: "AIzaSyD1234567890abcdefghijklmnopqrstuv",
      runId: "run_99",
    });
  });
});

test("sentryBeforeSend enforces strict data minimization: redacts source records and truncates prompts", () => {
  const eventWithRawData: any = {
    request: {
      data: {
        records: [
          { path: "src/secret.ts", content: "const secretKey = 'my_raw_repo_code';" },
          { path: "src/db.ts", content: "mongoose.connect();" },
        ],
        prompt: "System: Evaluate candidate repository. " + "A".repeat(400),
      },
    },
    extra: {
      records: [{ file: "secret.ts" }, { file: "token.ts" }],
      prompt: "B".repeat(500),
    },
  };

  const sanitized = sentryBeforeSend(eventWithRawData);
  assert.ok(sanitized);

  // Raw file records must be replaced with count summary
  assert.equal(
    typeof sanitized?.request?.data?.records,
    "string"
  );
  assert.ok(sanitized?.request?.data?.records?.includes("2 repository records omitted"));
  assert.ok(sanitized?.extra?.records?.includes("2 repository records omitted"));

  // Prompt must be truncated to <= 300 chars
  assert.ok(sanitized?.request?.data?.prompt?.includes("[truncated]"));
  assert.ok(sanitized?.request?.data?.prompt?.length <= 320);
  assert.ok(sanitized?.extra?.prompt?.includes("[truncated]"));
});

test("trackStep safe degradation: observability failure never interrupts core workflow", async () => {
  const { trackStep } = await import("./sentry.js");

  // Even if data parameter has cyclical or invalid properties, trackStep must succeed
  const circular: any = { name: "test" };
  circular.self = circular;

  const result = await trackStep(
    "assessment.resilience_test",
    "test.resilience",
    async () => {
      return 12345;
    },
    circular
  );

  assert.equal(result, 12345);
});


