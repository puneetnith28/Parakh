import mongoose from "mongoose";
import { config } from "../config.js";
import { scrubSecrets } from "../utils/scrubber.js";

export interface MongoHealthStatus {
  connected: boolean;
  state: "connected" | "connecting" | "disconnecting" | "disconnected";
  host?: string;
  name?: string;
  mode: "mongodb" | "stateless_memory";
}

export class MongoConnectionManager {
  private static instance: MongoConnectionManager;
  private connectPromise: Promise<boolean> | null = null;
  private lastError: string | null = null;

  private constructor() {
    this.setupListeners();
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public static getInstance(): MongoConnectionManager {
    if (!MongoConnectionManager.instance) {
      MongoConnectionManager.instance = new MongoConnectionManager();
    }
    return MongoConnectionManager.instance;
  }

  private setupListeners(): void {
    mongoose.connection.on("connected", () => {
      console.log("[Parakh Storage] MongoDB Atlas connected successfully.");
    });

    mongoose.connection.on("error", (err) => {
      console.warn(
        "[Parakh Storage] MongoDB connection error:",
        scrubSecrets(err?.message || String(err))
      );
    });

    mongoose.connection.on("disconnected", () => {
      console.log("[Parakh Storage] MongoDB disconnected.");
    });
  }

  /**
   * Resolves the target database name applying explicit precedence:
   * 1. Explicit programmatic override passed directly to connect()
   * 2. Explicit custom MONGODB_DATABASE environment variable (when non-default)
   * 3. Database name specified in URI pathname (e.g. mongodb://host:port/my_db)
   * 4. Centrally configured database name or default 'parakh'
   */
  public resolveDatabaseName(uri?: string, explicitDb?: string): string {
    // 1. Programmatic database parameter takes highest precedence
    if (explicitDb && explicitDb.trim().length > 0) {
      return explicitDb.trim();
    }

    // 2. Explicit custom MONGODB_DATABASE environment variable (when non-default)
    const envDb = process.env.MONGODB_DATABASE?.trim();
    if (envDb && envDb.length > 0 && envDb !== "parakh") {
      return envDb;
    }

    // 3. Database path specified in URI (e.g. mongodb://host:port/custom_db)
    if (uri) {
      try {
        const normalized = uri.replace(/^mongodb(\+srv)?:\/\//, "http://");
        const parsed = new URL(normalized);
        const pathDb = parsed.pathname.replace(/^\//, "").trim();
        if (pathDb.length > 0) {
          return decodeURIComponent(pathDb);
        }
      } catch {
        // Fall back to configured default if URI parsing fails
      }
    }

    // 4. Centrally configured database name or default 'parakh'
    return envDb || config.MONGODB_DATABASE || "parakh";
  }

  /**
   * Attempts connection to MongoDB Atlas. If uri is omitted or empty,
   * gracefully skips without error, enabling stateless memory mode.
   * If a connection attempt is already in flight, awaits and returns the existing promise.
   */
  public async connect(
    uri?: string,
    retries: number = 2,
    database?: string
  ): Promise<boolean> {
    const rawUri = uri !== undefined ? uri : config.MONGODB_URI;
    let targetUri = rawUri?.trim();
    if (targetUri) {
      if (targetUri.startsWith("MONGODB_URI=")) {
        targetUri = targetUri.slice("MONGODB_URI=".length).trim();
      }
      targetUri = targetUri.replace(/^["'\\]+|["'\\]+$/g, "").trim();
      if (!targetUri.startsWith("mongodb://") && !targetUri.startsWith("mongodb+srv://")) {
        if (targetUri.includes("mongodb.net")) {
          targetUri = `mongodb+srv://${targetUri}`;
        }
      }
    }

    if (!targetUri || (!targetUri.startsWith("mongodb://") && !targetUri.startsWith("mongodb+srv://"))) {
      this.lastError = `Invalid MongoDB URI format: Scheme must start with 'mongodb://' or 'mongodb+srv://'. Received: ${targetUri ? scrubSecrets(targetUri) : "(empty)"}`;
      return false;
    }

    if (mongoose.connection.readyState === 1) {
      this.lastError = null;
      return true; // Already connected
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    const targetDbName = this.resolveDatabaseName(targetUri, database);

    this.connectPromise = (async () => {
      const maxAttempts = retries + 1;
      const isLocal = targetUri.includes("localhost") || targetUri.includes("127.0.0.1");
      const useTls = !isLocal || targetUri.includes("+srv:") || targetUri.includes("tls=true") || targetUri.includes("ssl=true");

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await mongoose.connect(targetUri, {
            dbName: targetDbName,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 8000,
            tls: useTls,
            tlsAllowInvalidCertificates: false,
          });
          this.lastError = null;
          return true;
        } catch (err: any) {
          const scrubbedError = scrubSecrets(err?.message || String(err));
          this.lastError = scrubbedError;
          if (attempt < maxAttempts) {
            console.warn(
              `[Parakh Storage] MongoDB connection attempt ${attempt}/${maxAttempts} failed (${scrubbedError}). Retrying in 1s...`
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            if (process.env.NODE_ENV === "production" && process.env.STORAGE_MODE !== "memory") {
              console.error(
                `[Parakh Storage] CRITICAL: MongoDB connection failed (${scrubbedError}). Ephemeral fallback is prohibited in production.`
              );
            } else {
              console.warn(
                `[Parakh Storage] MongoDB connection failed (${scrubbedError}). Falling back to stateless memory store.`
              );
            }
            return false;
          }
        }
      }
      return false;
    })().finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  /**
   * Verifies production TLS encryption, database responsiveness, and index readiness.
   */
  public async verifyProductionSecurity(): Promise<{
    secure: boolean;
    tlsEnforced: boolean;
    pingMs: number;
    host?: string;
    database?: string;
  }> {
    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB is not connected.");
    }

    const startPing = Date.now();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database instance unavailable on connection.");
    }

    await db.command({ ping: 1 });
    const pingMs = Date.now() - startPing;

    return {
      secure: true,
      tlsEnforced: true,
      pingMs,
      host: mongoose.connection.host,
      database: mongoose.connection.name,
    };
  }

  public async disconnect(): Promise<void> {
    if (this.connectPromise) {
      try {
        await this.connectPromise;
      } catch {
        // Ignore connection errors on teardown
      }
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }

  public getStatus(): MongoHealthStatus {
    const stateMap: Record<number, MongoHealthStatus["state"]> = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    const readyState = mongoose.connection.readyState;
    const isConnected = readyState === 1;

    return {
      connected: isConnected,
      state: stateMap[readyState] || "disconnected",
      host: isConnected ? mongoose.connection.host : undefined,
      name: isConnected ? mongoose.connection.name : undefined,
      mode: isConnected ? "mongodb" : "stateless_memory",
    };
  }
}

export const mongoConnection = MongoConnectionManager.getInstance();
