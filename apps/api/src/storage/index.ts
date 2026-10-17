import { ReportStorage, MemoryReportStorage } from "./memoryStore.js";
import { MongoReportStorage } from "./mongoStore.js";
import mongoose from "mongoose";

export * from "./memoryStore.js";
export * from "./mongoStore.js";

let customStorage: ReportStorage | null = null;
const mongoStorage = new MongoReportStorage();
const memoryStorage = new MemoryReportStorage();

/**
 * Returns the configured storage adapter.
 * - If an explicit custom storage is set via setStorage(), returns it (used for test isolation).
 * - If STORAGE_MODE is explicitly set to 'memory', returns in-memory storage.
 * - If MongoDB is connected and ready (readyState === 1), dynamically returns MongoReportStorage.
 * - Otherwise dynamically returns MemoryReportStorage without caching, so that subsequent
 *   requests immediately transition to MongoReportStorage when connection completes.
 */
export function getStorage(): ReportStorage {
  if (customStorage) {
    return customStorage;
  }

  if (process.env.STORAGE_MODE === "memory") {
    return memoryStorage;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoStorage;
  }

  // Fallback to in-memory store dynamically without permanently caching it
  return memoryStorage;
}

/**
 * Explicitly sets or resets the storage instance (for test isolation).
 */
export function setStorage(storage: ReportStorage | null): void {
  customStorage = storage;
}
