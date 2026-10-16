import mongoose from "mongoose";

export interface MongoHealthStatus {
  connected: boolean;
  state: "connected" | "connecting" | "disconnecting" | "disconnected";
  host?: string;
  name?: string;
  mode: "mongodb" | "stateless_memory";
}

export class MongoConnectionManager {
  private static instance: MongoConnectionManager;
  private isConnecting = false;

  private constructor() {
    this.setupListeners();
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
      console.warn("[Parakh Storage] MongoDB connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("[Parakh Storage] MongoDB disconnected.");
    });
  }

  /**
   * Attempts connection to MongoDB Atlas. If uri is omitted or empty,
   * gracefully skips without error, enabling stateless memory mode.
   */
  public async connect(uri?: string): Promise<boolean> {
    const targetUri = uri || process.env.MONGODB_URI;

    if (!targetUri || !targetUri.trim().startsWith("mongodb")) {
      return false;
    }

    if (mongoose.connection.readyState === 1) {
      return true; // Already connected
    }

    if (this.isConnecting) {
      return false;
    }

    this.isConnecting = true;
    try {
      await mongoose.connect(targetUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 8000,
      });
      return true;
    } catch (err: any) {
      console.warn(
        `[Parakh Storage] MongoDB connection failed (${err.message}). Falling back to stateless memory store.`
      );
      return false;
    } finally {
      this.isConnecting = false;
    }
  }

  public async disconnect(): Promise<void> {
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
