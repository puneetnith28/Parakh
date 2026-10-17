import {
  type Requirement,
  type EvidenceRecord,
  type RequirementAssessment,
  type AssessmentReport,
  type EvidenceStatus,
  ModelAssessmentOutputSchema,
} from "@parakh/contracts";
import {
  CandidateSelector,
  CitationValidator,
  resolveAssessmentStatus,
  type RequirementCandidateUniverse,
} from "@parakh/assessment";
import { GemmaClient, formatAssessmentPrompt, HARDENED_ASSESSMENT_SYSTEM_INSTRUCTION } from "@parakh/integrations";

/**
 * Resilient Assessment Service with Bounded Retries and Graceful Degradation.
 *
 * Coordinates requirement evaluation against repository candidate evidence.
 * Retries transient model failures (5xx, 429, timeouts) with bounded exponential backoff.
 * On persistent failure, gracefully degrades individual requirements to 'needs_review'
 * without crashing the overall analysis run.
 */

export interface AssessmentServiceOptions {
  maxRetries?: number; // default: 1
  backoffMs?: number; // default: 1000 ms (configurable in tests)
  candidateSelector?: CandidateSelector;
  gemmaClient?: GemmaClient;
  citationValidator?: CitationValidator;
}

export interface EvaluateRepositoryParams {
  runId: string;
  opportunityId: string;
  repositoryUrl: string;
  commitSha: string;
  requirements: Requirement[];
  records: EvidenceRecord[];
}

export class AssessmentService {
  private readonly maxRetries: number;
  private readonly backoffMs: number;
  private readonly candidateSelector: CandidateSelector;
  private readonly gemmaClient: GemmaClient;
  private readonly citationValidator: CitationValidator;

  constructor(options: AssessmentServiceOptions = {}) {
    this.maxRetries = options.maxRetries ?? 1;
    this.backoffMs = options.backoffMs ?? 500;
    this.candidateSelector = options.candidateSelector || new CandidateSelector({ maxCandidates: 5 });
    this.gemmaClient = options.gemmaClient || new GemmaClient({ provider: "mock" });
    this.citationValidator = options.citationValidator || new CitationValidator();
  }

  /**
   * Evaluate a single requirement with bounded retry and graceful degradation.
   */
  async evaluateRequirement(
    requirement: Requirement,
    universe: RequirementCandidateUniverse,
    records: EvidenceRecord[]
  ): Promise<RequirementAssessment> {
    // 1. Zero evidence short-circuit
    if (universe.candidateCount === 0) {
      return {
        requirementId: requirement.id,
        requirementText: requirement.text,
        status: "not_demonstrated",
        rationale: "Not found in supplied repository evidence. No candidate files matched this technical requirement.",
        citedCandidateIds: [],
        citations: [],
        nextActions: [`Implement feature satisfying: ${requirement.text}`],
        confidence: "high",
        manuallyOverridden: false,
      };
    }

    const prompt = formatAssessmentPrompt({
      requirement,
      candidates: universe.candidates,
    });

    // 2. Bounded model invocation with retry
    let lastError: Error | null = null;
    let rawResponse: string | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0 && this.backoffMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.backoffMs * attempt));
        }

        const inference = await this.gemmaClient.executeConservativeReasoning(
          prompt,
          HARDENED_ASSESSMENT_SYSTEM_INSTRUCTION
        );
        rawResponse = inference.text;
        break; // Success
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    // 3. Graceful degradation if model completely unavailable
    if (!rawResponse) {
      return {
        requirementId: requirement.id,
        requirementText: requirement.text,
        status: "needs_review",
        rationale: `Assessment service temporarily unavailable: ${lastError?.message || "Model failed to respond"}`,
        citedCandidateIds: [],
        citations: [],
        nextActions: ["Retry assessment when model inference service is reachable"],
        confidence: "low",
        manuallyOverridden: false,
        downgradeReason: "Degraded due to persistent model API failure",
      };
    }

    // 4. Parse model JSON response
    let proposedStatus: EvidenceStatus = "needs_review";
    let proposedRationale = rawResponse;
    let citedIds: string[] = [];
    let limitations: string | undefined;
    let nextActions: string[] = [];

    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = ModelAssessmentOutputSchema.parse(JSON.parse(jsonMatch[0]));
        proposedStatus = parsed.status;
        proposedRationale = parsed.rationale;
        citedIds = parsed.citedCandidateIds;
        limitations = parsed.limitations;
        nextActions = parsed.nextActions;
      }
    } catch {
      proposedStatus = "needs_review";
      proposedRationale = "Model output could not be parsed into valid assessment JSON schema.";
    }

    // 5. Deterministic citation validation
    const validationOutcome = this.citationValidator.validate(
      citedIds,
      universe.candidates,
      records
    );

    // 6. Conservative status assignment and downgrade rules
    const statusOutcome = resolveAssessmentStatus({
      requirement,
      proposedStatus,
      proposedRationale,
      validationOutcome,
      candidateUniverseCount: universe.candidateCount,
    });

    return {
      requirementId: requirement.id,
      requirementText: requirement.text,
      status: statusOutcome.finalStatus,
      rationale: statusOutcome.finalRationale,
      citedCandidateIds: citedIds,
      citations: statusOutcome.verifiedCitations,
      limitations,
      nextActions,
      confidence: statusOutcome.finalStatus === "demonstrated" ? "high" : "medium",
      manuallyOverridden: false,
      downgradeReason: statusOutcome.downgradeReason,
    };
  }

  /**
   * Run comprehensive evaluation across all requirements.
   */
  async evaluateRepository(params: EvaluateRepositoryParams): Promise<AssessmentReport> {
    const { runId, opportunityId, repositoryUrl, commitSha, requirements, records } = params;

    const repoIndex = {
      repository: repositoryUrl.replace(/^https?:\/\/github\.com\//, ""),
      commitSha,
      records,
      totalFiles: records.length,
      indexedAt: new Date().toISOString(),
    };

    const universes = this.candidateSelector.selectBatch(requirements, repoIndex);
    const assessments: RequirementAssessment[] = [];

    for (let i = 0; i < universes.length; i++) {
      const universe = universes[i];
      const req = requirements.find((r) => r.id === universe.requirementId)!;
      // Add throttle pause between active LLM inferences for free-tier rate limits
      if (i > 0 && universe.candidateCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
      const assessment = await this.evaluateRequirement(req, universe, records);
      assessments.push(assessment);
    }

    const summary = {
      total: assessments.length,
      demonstrated: assessments.filter((a) => a.status === "demonstrated").length,
      partiallyDemonstrated: assessments.filter((a) => a.status === "partially_demonstrated").length,
      notDemonstrated: assessments.filter((a) => a.status === "not_demonstrated").length,
      needsReview: assessments.filter((a) => a.status === "needs_review").length,
    };

    return {
      id: `report_${runId}`,
      opportunityId,
      repositoryUrl,
      resolvedCommitSha: commitSha,
      status: "completed",
      assessments,
      coverageSummary: summary,
      scannedFilesCount: records.length,
      skippedFilesCount: 0,
      createdAt: new Date().toISOString(),
    };
  }
}
