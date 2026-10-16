import test from "node:test";
import assert from "node:assert/strict";
import { scrubSecrets, scrubObject } from "./scrubber.js";

test("scrubSecrets redacts known secret formats and credential tokens", () => {
  // 1. GitHub Token
  const textWithGhToken = "Cloning with token: ghp_1234567890abcdefghijklmnopqrstuvwxyzAB";
  assert.equal(
    scrubSecrets(textWithGhToken),
    "Cloning with token: [REDACTED_GITHUB_TOKEN]"
  );

  // 2. Google AI Studio Key
  const textWithAiKey = "Connecting with key: AIzaSyD1234567890abcdefghijklmnopqrstuv";
  assert.equal(
    scrubSecrets(textWithAiKey),
    "Connecting with key: [REDACTED_AI_STUDIO_KEY]"
  );

  // 3. OpenAI Key
  const textWithOpenAi = "API Error from key sk-abcdef1234567890abcdef1234567890abcdef";
  assert.equal(
    scrubSecrets(textWithOpenAi),
    "API Error from key [REDACTED_API_KEY]"
  );

  // 4. Bearer Token
  const textWithBearer = "Authorization: Bearer secret_jwt_token_payload_xyz123";
  assert.equal(
    scrubSecrets(textWithBearer),
    "Authorization: Bearer [REDACTED_BEARER_TOKEN]"
  );

  // 5. Database URI with password
  const mongoUri = "mongodb+srv://admin:SuperSecretP@ss123@cluster0.abcde.mongodb.net/parakh";
  const scrubbedMongo = scrubSecrets(mongoUri);
  assert.ok(!scrubbedMongo.includes("SuperSecretP@ss123"));
  assert.ok(scrubbedMongo.includes("[REDACTED_PASSWORD]"));

  // 6. Private Key
  const rsaKey = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...\n-----END RSA PRIVATE KEY-----";
  assert.equal(scrubSecrets(rsaKey), "[REDACTED_PRIVATE_KEY]");
});

test("scrubObject recursively sanitizes structured payloads and logs", () => {
  const logPayload = {
    event: "model_request_error",
    timestamp: new Date().toISOString(),
    details: {
      url: "https://api.github.com/repos/test/test",
      authHeader: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz",
      env: {
        DATABASE_URL: "postgresql://postgres:MyDbPassword99@localhost:5432/test",
      },
      tags: ["ghp_abc123456789012345678901234567890123456"],
    },
  };

  const scrubbed = scrubObject(logPayload);

  assert.equal(scrubbed.details.authHeader, "Bearer [REDACTED_BEARER_TOKEN]");
  assert.ok(!scrubbed.details.env.DATABASE_URL.includes("MyDbPassword99"));
  assert.ok(scrubbed.details.env.DATABASE_URL.includes("[REDACTED_PASSWORD]"));
  assert.equal(scrubbed.details.tags[0], "[REDACTED_GITHUB_TOKEN]");
});
