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
