import crypto from "node:crypto";
import {
  type ExtractedRequirementsResult,
  ExtractedRequirementsResultSchema,
  type Requirement,
} from "@parakh/contracts";
import { RequirementDeduplicator } from "@parakh/assessment";
import { GemmaClient } from "@parakh/integrations";
import { config } from "../config.js";
import { TextSanitizer } from "./textSanitizer.js";
import { SourceIndexer } from "./sourceIndexer.js";
import { ModelParser } from "./modelParser.js";

export interface ExtractionOptions {
  title?: string;
  pageNumber?: number;
  client?: GemmaClient;
}

export interface ExtractionResponse {
  opportunity: {
    id: string;
    title: string;
    rawText: string;
    characterCount: number;
    createdAt: string;
  };
  extraction: ExtractedRequirementsResult;
  metadata: {
    provider: string;
    model: string;
    latencyMs: number;
    isMock: boolean;
    fallbackActive?: boolean;
    requirementCount: number;
  };
}

export class ExtractionService {
  /**
   * Orchestrates technical requirement extraction from opportunity text:
   * 1. Sanitizes brief text
   * 2. Prompts model client
   * 3. Validates structured JSON schema
   * 4. Deduplicates requirements
   * 5. Populates source location offsets and snippets
   */
  public static async extract(
    rawText: string,
    options: ExtractionOptions = {}
  ): Promise<ExtractionResponse> {
    const startTime = Date.now();
    const sanitized = TextSanitizer.sanitize(rawText);

    const opportunityId = `opp_${crypto.randomUUID()}`;
    const title =
      typeof options.title === "string" && options.title.trim()
        ? options.title.trim()
        : "Untitled Opportunity Brief";

    const client =
      options.client ||
      new GemmaClient({
        provider: config.MODEL_PROVIDER as any,
        modelName: config.MODEL_NAME,
        apiKey: config.MODEL_API_KEY || config.AI_STUDIO_API_KEY,
      });

    let rawRequirements: Requirement[] = [];
    let summary = "Extracted technical requirements from opportunity brief";
    let provider: string = client.adapter.provider;
    let modelName = client.adapter.modelName;
    let latencyMs = 0;
    let isMock = provider === "mock";
    let fallbackActive = false;

    try {
      const modelResult = await client.extractRequirements(sanitized.sanitizedText);
      latencyMs = modelResult.latencyMs;
      provider = modelResult.provider;
      modelName = modelResult.model;
      isMock = Boolean(modelResult.isMock || provider === "mock");

      const parsed = ModelParser.parseWithSchema(
        modelResult.text,
        ExtractedRequirementsResultSchema
      );

      if (parsed.success && parsed.data && parsed.data.requirements.length > 0) {
        rawRequirements = parsed.data.requirements.map((r) => ({
          ...r,
          category: r.category || "general",
          priority: r.priority || "mandatory",
          sourceLocation: r.sourceLocation
            ? {
                ...r.sourceLocation,
                origin: r.sourceLocation.origin || "brief_extracted",
              }
            : undefined,
        }));
        if (parsed.data.summary) {
          summary = parsed.data.summary;
        }
      } else {
        fallbackActive = true;
        isMock = true;
        provider = "deterministic-fallback";
        rawRequirements = this.fallbackExtraction(sanitized.sanitizedText);
      }
    } catch {
      latencyMs = Date.now() - startTime;
      fallbackActive = true;
      isMock = true;
      provider = "deterministic-fallback";
      rawRequirements = this.fallbackExtraction(sanitized.sanitizedText);
    }

    // Conservative deduplication of near-duplicate requirements
    const dedupedRequirements = RequirementDeduplicator.deduplicate(rawRequirements);

    // Populate source location provenance: line offsets, character offsets, and source snippets
    const indexedRequirements = SourceIndexer.indexRequirements(
      sanitized.sanitizedText,
      dedupedRequirements,
      options.pageNumber || 1,
      title
    );

    const extraction: ExtractedRequirementsResult = {
      summary,
      requirements: indexedRequirements,
    };

    // Validate complete output against contract schema
    ExtractedRequirementsResultSchema.parse(extraction);

    return {
      opportunity: {
        id: opportunityId,
        title,
        rawText: sanitized.sanitizedText,
        characterCount: sanitized.characterCount,
        createdAt: new Date().toISOString(),
      },
      extraction,
      metadata: {
        provider,
        model: modelName,
        latencyMs,
        isMock,
        fallbackActive,
        requirementCount: indexedRequirements.length,
      },
    };
  }

  /**
   * Deterministic fallback extraction when model inference fails or returns invalid schema.
   */
  private static fallbackExtraction(text: string): Requirement[] {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length >= 10 && !l.startsWith("#"));

    const requirements: Requirement[] = [];
    let reqIdx = 1;

    for (const line of lines) {
      if (requirements.length >= 10) break;
      const lower = line.toLowerCase();

      let category: Requirement["category"] = "general";
      if (/react|frontend|ui|html|css|tailwind|vue|web/i.test(lower)) category = "frontend";
      else if (/node|express|api|endpoint|backend|python|service/i.test(lower)) category = "backend";
      else if (/database|sql|postgres|mongo|schema/i.test(lower)) category = "database";
      else if (/docker|ci\/cd|deploy|render|devops|aws/i.test(lower)) category = "devops";
      else if (/test|jest|e2e|unit/i.test(lower)) category = "testing";
      else if (/auth|security|jwt|oauth|ssrf/i.test(lower)) category = "security";

      const priority: Requirement["priority"] = /must|require|essential|mandatory/i.test(lower)
        ? "mandatory"
        : "preferred";

      requirements.push({
        id: `req_${String(reqIdx++).padStart(3, "0")}`,
        text: line.replace(/^[-*•\d.]+\s*/, "").slice(0, 500),
        category,
        priority,
        acceptanceCriteria: [`Requirement satisfies: ${line.slice(0, 80)}`],
      });
    }

    if (requirements.length === 0) {
      requirements.push(
        {
          id: "req_001",
          text: "Implement core technical architecture and business domain services",
          category: "architecture",
          priority: "mandatory",
          acceptanceCriteria: ["Application components execute without error"],
        },
        {
          id: "req_002",
          text: "Automate verification with unit and integration test suites",
          category: "testing",
          priority: "mandatory",
          acceptanceCriteria: ["Automated test suites pass with zero failures"],
        }
      );
    }

    return requirements;
  }
}
