import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mongoConnection } from "./mongodb.js";

describe("MongoConnectionManager", () => {
  it("reports disconnected stateless_memory mode when unconfigured", () => {
    const status = mongoConnection.getStatus();
    assert.equal(status.connected, false);
    assert.equal(status.mode, "stateless_memory");
    assert.equal(status.state, "disconnected");
  });

  it("gracefully handles empty or invalid URI strings", async () => {
    const resultEmpty = await mongoConnection.connect("");
    assert.equal(resultEmpty, false);

    const resultNonMongo = await mongoConnection.connect("http://not-mongo.com");
    assert.equal(resultNonMongo, false);

    const status = mongoConnection.getStatus();
    assert.equal(status.connected, false);
    assert.equal(status.mode, "stateless_memory");
  });

  it("verifyProductionSecurity rejects when disconnected", async () => {
    await assert.rejects(
      async () => {
        await mongoConnection.verifyProductionSecurity();
      },
      {
        message: "MongoDB is not connected.",
      }
    );
  });

  it("verifyProductionSecurity validates live TLS connection if MONGODB_URI is provided", async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri || !uri.startsWith("mongodb")) {
      return; // Skip if no live credentials in test runner environment
    }

    const connected = await mongoConnection.connect(uri);
    if (!connected) return;

    const result = await mongoConnection.verifyProductionSecurity();
    assert.equal(result.secure, true);
    assert.equal(result.tlsEnforced, true);
    assert.ok(typeof result.pingMs === "number");
    assert.ok(result.host);

    await mongoConnection.disconnect();
  });
});
