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
  CanonicalAssessmentEvaluator,
  UnifiedEvidenceRetriever,
  type RequirementCandidateUniverse,
} from "@parakh/assessment";
import { GemmaClient, formatAssessmentPrompt, HARDENED_ASSESSMENT_SYSTEM_INSTRUCTION } from "@parakh/integrations";

/**
 * Resilient Assessment Service with Bounded Retries and Graceful Degradation.
 *
 * Coordinates requirement evaluation against repository candidate evidence.
 * Retries transient model failures (5xx, 429, timeouts) with bounded exponential backoff.
 * Delegates evaluation, citation validation, and status resolution to CanonicalAssessmentEvaluator.
 */

export interface AssessmentServiceOptions {
  maxRetries?: number; // default: 1
  backoffMs?: number; // default: 1000 ms (configurable in tests)
  candidateSelector?: CandidateSelector;
  retriever?: UnifiedEvidenceRetriever;
  gemmaClient?: GemmaClient;
  citationValidator?: CitationValidator;
  evaluator?: CanonicalAssessmentEvaluator;
}

export interface EvaluateRepositoryParams {
  runId: string;
  opportunityId: string;
  opportunityTitle?: string;
  repositoryUrl: string;
  commitSha: string;
  repoMetadata?: {
    owner: string;
    repo: string;
    defaultBranch?: string;
  };
  warnings?: string[];
  requirements: Requirement[];
  records: EvidenceRecord[];
}

export class AssessmentService {
  private readonly maxRetries: number;
  private readonly backoffMs: number;
  private readonly candidateSelector: CandidateSelector;
  private readonly retriever?: UnifiedEvidenceRetriever;
  private readonly gemmaClient: GemmaClient;
  private readonly citationValidator: CitationValidator;
  private readonly evaluator: CanonicalAssessmentEvaluator;

  constructor(options: AssessmentServiceOptions = {}) {
    this.maxRetries = options.maxRetries ?? 1;
    this.backoffMs = options.backoffMs ?? 500;
    this.candidateSelector = options.candidateSelector || new CandidateSelector({ maxCandidates: 5 });
    this.retriever = options.retriever;
    this.gemmaClient = options.gemmaClient || new GemmaClient({ provider: "mock" });
    this.citationValidator = options.citationValidator || new CitationValidator();
    this.evaluator = options.evaluator || new CanonicalAssessmentEvaluator({ maxCandidates: 5 });
  }

  /**
   * Evaluate a single requirement with bounded retry and graceful degradation,
   * delegating deterministic citation validation and conservative status resolution
   * to the CanonicalAssessmentEvaluator.
   */
  async evaluateRequirement(
    requirement: Requirement,
    universe: RequirementCandidateUniverse,
    records: EvidenceRecord[]
  ): Promise<RequirementAssessment> {
    // Zero evidence short-circuit
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

    const modelEvaluator = async (
      req: Requirement,
      uni: RequirementCandidateUniverse
    ): Promise<{
      status: EvidenceStatus;
      rationale: string;
      citedCandidateIds: string[];
      limitations?: string;
      nextActions?: string[];
    }> => {
      const prompt = formatAssessmentPrompt({
        requirement: req,
        candidates: uni.candidates,
      });

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

      // Graceful degradation if model completely unavailable
      if (!rawResponse) {
        return {
          status: "needs_review",
          rationale: `Assessment service temporarily unavailable: ${lastError?.message || "Model failed to respond"}`,
          citedCandidateIds: [],
          limitations: "Model API communication failed",
          nextActions: ["Retry assessment when model inference service is reachable"],
          downgradeReason: "Degraded due to persistent model API failure",
        };
      }

      // Parse model JSON response
      try {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = ModelAssessmentOutputSchema.parse(JSON.parse(jsonMatch[0]));
          return {
            status: parsed.status,
            rationale: parsed.rationale,
            citedCandidateIds: parsed.citedCandidateIds,
            limitations: parsed.limitations,
            nextActions: parsed.nextActions,
          };
        }
      } catch {
        // Fall through
      }

      return {
        status: "needs_review",
        rationale: "Model output could not be parsed into valid assessment JSON schema.",
        citedCandidateIds: [],
        nextActions: ["Manual code inspection required"],
      };
    };

    return this.evaluator.evaluateRequirement(
      {
        requirement,
        universe,
        modelEvaluator,
      },
      records
    );
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

    const universes = this.retriever
      ? await this.retriever.retrieveBatch(requirements, repoIndex)
      : this.candidateSelector.selectBatch(requirements, repoIndex);
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

    const gapRecommendationsSet = new Set<string>();
    const limitationsSet = new Set<string>(params.warnings || []);

    for (const a of assessments) {
      if (a.status !== "demonstrated" && a.nextActions) {
        for (const action of a.nextActions) {
          if (action.trim()) gapRecommendationsSet.add(action.trim());
        }
      }
      if (a.limitations && a.limitations.trim()) {
        limitationsSet.add(a.limitations.trim());
      }
    }

    return {
      id: `report_${runId}`,
      opportunityId,
      opportunityTitle: params.opportunityTitle,
      repositoryUrl,
      resolvedCommitSha: commitSha,
      repoMetadata: params.repoMetadata,
      status: "completed",
      assessments,
      coverageSummary: summary,
      scannedFilesCount: records.length,
      skippedFilesCount: 0,
      limitations: Array.from(limitationsSet),
      gapRecommendations: Array.from(gapRecommendationsSet),
      createdAt: new Date().toISOString(),
    };
  }
}
