import { ReportStorage, MemoryReportStorage } from "./memoryStore.js";
import { MongoReportStorage } from "./mongoStore.js";
import mongoose from "mongoose";

export * from "./memoryStore.js";
export * from "./mongoStore.js";

let storageInstance: ReportStorage | null = null;

/**
 * Returns the configured storage adapter.
 * Uses MongoReportStorage if MongoDB is connected, otherwise MemoryReportStorage.
 */
export function getStorage(): ReportStorage {
  if (storageInstance) {
    return storageInstance;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri && mongoUri.trim().startsWith("mongodb") && mongoose.connection.readyState === 1) {
    storageInstance = new MongoReportStorage();
  } else {
    // Stateless fallback mode
    storageInstance = new MemoryReportStorage();
  }

  return storageInstance;
}

/**
 * Resets storage instance (useful for test isolation).
 */
export function setStorage(storage: ReportStorage | null): void {
  storageInstance = storage;
}
