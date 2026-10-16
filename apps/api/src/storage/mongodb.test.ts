import test from "node:test";
import assert from "node:assert/strict";
import { mongoConnection } from "./mongodb.js";

test("mongoConnection reports disconnected stateless_memory mode when unconfigured", () => {
  const status = mongoConnection.getStatus();
  assert.equal(status.connected, false);
  assert.equal(status.mode, "stateless_memory");
  assert.equal(status.state, "disconnected");
});

test("mongoConnection gracefully handles empty or invalid URI strings", async () => {
  const resultEmpty = await mongoConnection.connect("");
  assert.equal(resultEmpty, false);

  const resultNonMongo = await mongoConnection.connect("http://not-mongo.com");
  assert.equal(resultNonMongo, false);

  const status = mongoConnection.getStatus();
  assert.equal(status.connected, false);
  assert.equal(status.mode, "stateless_memory");
});
