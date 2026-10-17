import dotenv from "dotenv";
dotenv.config();

import { ExtractionService } from "../../apps/api/src/services/extractionService.js";
import { mongoConnection } from "../../apps/api/src/storage/mongodb.js";
import { MongoReportStorage } from "../../apps/api/src/storage/mongoStore.js";
import type { AssessmentReport } from "@parakh/contracts";

async function verifyLiveEndToEnd() {
  console.log("=== Starting Live End-to-End Smoke Test ===");

  // 1. Live Extraction with Gemini API
  const sampleBrief =
    "We are seeking a senior backend engineer to develop high-throughput Node.js microservices with automated integration test suites and MongoDB document storage.";
  console.log(`Extracting requirements via live Gemini API (${process.env.MODEL_NAME})...`);
  const extractionResult = await ExtractionService.extract(sampleBrief, { title: "Senior Backend Role" });

  console.log("[PASS] Live Extraction Succeeded!");
  console.log("Provider:", extractionResult.metadata.provider);
  console.log("Model:", extractionResult.metadata.model);
  console.log("isMock:", extractionResult.metadata.isMock);
  console.log("Extracted Requirements Count:", extractionResult.extraction.requirements.length);
  extractionResult.extraction.requirements.forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.priority}] ${r.text}`);
  });

  if (extractionResult.metadata.isMock) {
    throw new Error("Expected live model inference, but got isMock: true");
  }

  // 2. Live Persistence with MongoDB Atlas
  console.log("\nConnecting to MongoDB Atlas Cluster...");
  const connected = await mongoConnection.connect(process.env.MONGODB_URI);
  if (!connected) {
    throw new Error("Failed to connect to MongoDB Atlas");
  }
  const security = await mongoConnection.verifyProductionSecurity();
  console.log(
    `[PASS] MongoDB Atlas Connected! TLS Enforced: ${security.tlsEnforced}, Database: ${security.database}, Ping: ${security.pingMs}ms`
  );

  const mongoStore = new MongoReportStorage();
  const testReport: AssessmentReport = {
    id: `rep_live_test_${Date.now()}`,
    opportunityId: extractionResult.opportunity.id,
    repositoryUrl: "https://github.com/puneetnith28/Parakh",
    resolvedCommitSha: "d8fde40a7cf3ea24a2c0aa8e12e3e6f987654321",
    status: "completed",
    assessments: [],
    coverageSummary: { total: 0, demonstrated: 0, partiallyDemonstrated: 0, notDemonstrated: 0, needsReview: 0 },
    scannedFilesCount: 10,
    skippedFilesCount: 0,
    createdAt: new Date().toISOString(),
  };
  const testToken = "1234567890abcdef".repeat(4);

  console.log("Saving report to MongoDB Atlas...");
  await mongoStore.saveReport(testReport, testToken);
  console.log("[PASS] Report saved to MongoDB Atlas collection!");

  console.log("Retrieving report from MongoDB Atlas...");
  const retrieved = await mongoStore.getReportById(testReport.id);
  if (!retrieved || retrieved.report.id !== testReport.id) {
    throw new Error("Retrieved report mismatch");
  }
  console.log("[PASS] Report successfully retrieved from MongoDB Atlas!");

  console.log("Cleaning up test report from Atlas...");
  await mongoStore.deleteReport(testReport.id);
  console.log("[PASS] Test report deleted cleanly.");

  await mongoConnection.disconnect();
  console.log("\n=== ALL LIVE INTEGRATIONS FULLY VERIFIED! ===");
}

verifyLiveEndToEnd().catch((err) => {
  console.error("Live verification failed:", err);
  process.exit(1);
});
