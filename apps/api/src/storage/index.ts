import { ReportStorage, MemoryReportStorage } from "./memoryStore.js";

export * from "./memoryStore.js";

let storageInstance: ReportStorage | null = null;

/**
 * Returns the configured storage adapter.
 * Defaults to in-memory storage if MONGODB_URI is absent.
 */
export function getStorage(): ReportStorage {
  if (storageInstance) {
    return storageInstance;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri && mongoUri.trim().startsWith("mongodb")) {
    // When MongoDB is wired in Step 062/063, MongoReportStorage will be returned here
    try {
      // Lazy check for mongo storage implementation
      storageInstance = new MemoryReportStorage(); // Fallback until Step 062 connects
    } catch {
      storageInstance = new MemoryReportStorage();
    }
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
