import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { mongoConnection } from "./mongodb.js";

describe("MongoConnectionManager", () => {
  it("reports disconnected stateless_memory mode when unconfigured", () => {
    const status = mongoConnection.getStatus();
    assert.equal(status.connected, false);
    assert.equal(status.mode, "stateless_memory");
    assert.equal(status.state, "disconnected");
  });

  it("gracefully handles empty, whitespace-only, or non-mongodb URI strings without connecting", async () => {
    let connectCalled = false;
    const connectMock = mock.method(mongoose, "connect", async () => {
      connectCalled = true;
      return mongoose;
    });

    try {
      const resultEmpty = await mongoConnection.connect("");
      assert.equal(resultEmpty, false);
      assert.equal(connectCalled, false);

      const resultWhitespace = await mongoConnection.connect("   ");
      assert.equal(resultWhitespace, false);
      assert.equal(connectCalled, false);

      const resultNonMongo = await mongoConnection.connect("http://not-mongo.com");
      assert.equal(resultNonMongo, false);
      assert.equal(connectCalled, false);

      const status = mongoConnection.getStatus();
      assert.equal(status.connected, false);
      assert.equal(status.mode, "stateless_memory");
    } finally {
      connectMock.mock.restore();
    }
  });

  describe("Database Name Resolution and Precedence", () => {
    it("defaults to 'parakh' when no override or URI path is provided", () => {
      const db = mongoConnection.resolveDatabaseName("mongodb://localhost:27017");
      assert.equal(db, "parakh");

      const dbNoUri = mongoConnection.resolveDatabaseName(undefined);
      assert.equal(dbNoUri, "parakh");
    });

    it("respects explicitly passed programmatic database name", () => {
      const db = mongoConnection.resolveDatabaseName(
        "mongodb://localhost:27017/ignored_path",
        "custom_programmatic_db"
      );
      assert.equal(db, "custom_programmatic_db");
    });

    it("extracts database path from standard and SRV MongoDB URIs", () => {
      const dbStandard = mongoConnection.resolveDatabaseName("mongodb://localhost:27017/analytics_db");
      assert.equal(dbStandard, "analytics_db");

      const dbSrv = mongoConnection.resolveDatabaseName(
        "mongodb+srv://user:pass@cluster.mongodb.net/production_tenant?retryWrites=true&w=majority"
      );
      assert.equal(dbSrv, "production_tenant");

      const dbEncoded = mongoConnection.resolveDatabaseName(
        "mongodb://localhost:27017/my%20test%20db"
      );
      assert.equal(dbEncoded, "my test db");
    });

    it("respects explicit MONGODB_DATABASE environment variable over default URI path", () => {
      const prevEnv = process.env.MONGODB_DATABASE;
      try {
        process.env.MONGODB_DATABASE = "override_from_env";
        const db = mongoConnection.resolveDatabaseName("mongodb://localhost:27017");
        assert.equal(db, "override_from_env");
      } finally {
        if (prevEnv !== undefined) {
          process.env.MONGODB_DATABASE = prevEnv;
        } else {
          delete process.env.MONGODB_DATABASE;
        }
      }
    });
  });

  describe("Mongoose Connection Options (dbName verification)", () => {
    it("passes expected dbName to mongoose.connect()", async () => {
      let capturedOptions: any = null;
      let capturedUri: string | null = null;

      const connectMock = mock.method(mongoose, "connect", async (uri: any, options: any) => {
        capturedUri = uri;
        capturedOptions = options;
        return mongoose;
      });

      try {
        await mongoConnection.connect("mongodb://mock-cluster:27017", 0);
        assert.ok(capturedOptions, "mongoose.connect must have been called");
        assert.equal(capturedUri, "mongodb://mock-cluster:27017");
        assert.equal(capturedOptions.dbName, "parakh");

        // Disconnect to reset state for next test call
        await mongoConnection.disconnect();

        // Pass explicit database parameter
        await mongoConnection.connect("mongodb://mock-cluster:27017", 0, "explicit_test_db");
        assert.equal(capturedOptions.dbName, "explicit_test_db");

        await mongoConnection.disconnect();

        // Pass URI with path
        await mongoConnection.connect("mongodb://mock-cluster:27017/uri_specified_db", 0);
        assert.equal(capturedOptions.dbName, "uri_specified_db");
      } finally {
        connectMock.mock.restore();
        await mongoConnection.disconnect();
      }
    });
  });

  it("retries connection attempts and gracefully falls back to stateless memory", async () => {
    // When unreachable host is provided, retry loop runs and safely returns false without unhandled error
    const result = await mongoConnection.connect("mongodb://nonexistent.invalid:27017/test", 0);
    assert.equal(result, false);
    assert.equal(mongoConnection.getStatus().connected, false);
    assert.equal(mongoConnection.getStatus().mode, "stateless_memory");
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

  it("verifyProductionSecurity validates live TLS connection if explicit live test flag is set", async () => {
    const uri = process.env.TEST_LIVE_MONGODB === "true" ? process.env.MONGODB_URI : undefined;
    if (!uri || !uri.startsWith("mongodb")) {
      return; // Skip: do not connect to live Atlas unless explicitly instructed
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

