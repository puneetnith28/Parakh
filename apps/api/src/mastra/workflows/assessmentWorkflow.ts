import {
  type Requirement,
  type EvidenceRecord,
  type RequirementAssessment,
  type AssessmentReport,
  type EvidenceStatus,
  ModelAssessmentOutputSchema,
} from "@parakh/contracts";
import { CandidateSelector, type RequirementCandidateUniverse } from "@parakh/assessment";
import { GemmaClient } from "@parakh/integrations";

/**
 * Mastra Typed Assessment Workflow.
 *
 * Coordinates 5 explicit typed stages:
 * - Step A: Input Validation
 * - Step B: Per-Requirement Evidence Retrieval
 * - Step C: Gemma Model Evaluation
 * - Step D: Deterministic Citation Validation & Status Resolution
 * - Step E: Report Assembly & Telemetry
 */

export interface AssessmentWorkflowInput {
  runId: string;
  opportunityId: string;
  repositoryUrl: string;
  commitSha: string;
  requirements: Requirement[];
  records: EvidenceRecord[];
}

export interface StepTelemetry {
  stepName: string;
  status: "success" | "failed" | "skipped";
  durationMs: number;
}

export interface AssessmentWorkflowOutput {
  runId: string;
  report: AssessmentReport;
  stepTelemetries: StepTelemetry[];
  totalDurationMs: number;
}

export interface WorkflowDependencies {
  candidateSelector?: CandidateSelector;
  gemmaClient?: GemmaClient;
}

export class AssessmentWorkflow {
  private readonly candidateSelector: CandidateSelector;
  private readonly gemmaClient: GemmaClient;

  constructor(deps: WorkflowDependencies = {}) {
    this.candidateSelector = deps.candidateSelector || new CandidateSelector({ maxCandidates: 5 });
    this.gemmaClient = deps.gemmaClient || new GemmaClient({ provider: "mock" });
  }

  /**
   * Execute the full assessment workflow sequentially.
   */
  async execute(input: AssessmentWorkflowInput): Promise<AssessmentWorkflowOutput> {
    const overallStartTime = Date.now();
    const telemetries: StepTelemetry[] = [];

    // --- Step A: Input Validation ---
    const stepAStart = Date.now();
    if (!input.requirements || input.requirements.length === 0) {
      throw new Error("Assessment workflow requires at least one requirement");
    }
    if (!input.commitSha || !/^[0-9a-f]{40}$/i.test(input.commitSha)) {
      throw new Error(`Invalid commit SHA: '${input.commitSha}'`);
    }
    telemetries.push({
      stepName: "Step A: Input Validation",
      status: "success",
      durationMs: Date.now() - stepAStart,
    });

    // --- Step B: Per-Requirement Candidate Retrieval ---
    const stepBStart = Date.now();
    const repoIndex = {
      repository: input.repositoryUrl.replace(/^https?:\/\/github\.com\//, ""),
      commitSha: input.commitSha,
      records: input.records,
      totalFiles: input.records.length,
      indexedAt: new Date().toISOString(),
    };

    const candidateUniverses: RequirementCandidateUniverse[] = this.candidateSelector.selectBatch(
      input.requirements,
      repoIndex
    );
    telemetries.push({
      stepName: "Step B: Per-Requirement Evidence Retrieval",
      status: "success",
      durationMs: Date.now() - stepBStart,
    });

    // --- Step C: Gemma Model Evaluation ---
    const stepCStart = Date.now();
    const evaluatedResults: RequirementAssessment[] = [];

    for (const universe of candidateUniverses) {
      const req = input.requirements.find((r) => r.id === universe.requirementId)!;

      if (universe.candidateCount === 0) {
        // Deterministic zero-evidence short-circuit
        evaluatedResults.push({
          requirementId: req.id,
          requirementText: req.text,
          status: "not_demonstrated",
          rationale: "No matching implementation, tests, or documentation found in repository evidence.",
          citedCandidateIds: [],
          citations: [],
          nextActions: ["Implement requirement feature"],
          confidence: "high",
          manuallyOverridden: false,
        });
        continue;
      }

      // Format prompt for Gemma
      const prompt = `Requirement: "${req.text}"\nCandidates:\n${universe.candidates
        .map((c) => `[${c.candidateId}] ${c.path} (L${c.startLine}-L${c.endLine}):\n${c.content}`)
        .join("\n\n")}`;

      const inference = await this.gemmaClient.executeConservativeReasoning(prompt);

      let parsedStatus: EvidenceStatus = "needs_review";
      let parsedRationale = inference.text;
      let citedIds: string[] = [];
      let limitations: string | undefined;
      let nextActions: string[] = [];

      try {
        const jsonMatch = inference.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = ModelAssessmentOutputSchema.parse(JSON.parse(jsonMatch[0]));
          parsedStatus = parsed.status;
          parsedRationale = parsed.rationale;
          citedIds = parsed.citedCandidateIds;
          limitations = parsed.limitations;
          nextActions = parsed.nextActions;
        }
      } catch {
        parsedStatus = "needs_review";
      }

      // --- Step D: Deterministic Citation Validation & Status Verification ---
      // Verify that every citedCandidateId actually exists in the provided candidate universe
      const candidateMap = new Map(universe.candidates.map((c) => [c.candidateId, c]));
      const verifiedCitations = [];

      for (const cid of citedIds) {
        const found = candidateMap.get(cid);
        if (found) {
          verifiedCitations.push({
            candidateId: found.candidateId,
            repository: repoIndex.repository,
            commitSha: repoIndex.commitSha,
            path: found.path,
            canonicalUrl: found.canonicalUrl,
            startLine: found.startLine,
            endLine: found.endLine,
            snippet: found.content.slice(0, 500),
            evidenceType: found.fileType,
          });
        }
      }

      let finalStatus: EvidenceStatus = parsedStatus;
      let downgradeReason: string | undefined;

      // Rule: if model claimed demonstrated but cited 0 valid candidates -> downgrade to needs_review
      if (parsedStatus === "demonstrated" && verifiedCitations.length === 0) {
        finalStatus = "needs_review";
        downgradeReason = "Downgraded to needs_review: claimed demonstrated but no valid candidate IDs were cited";
      }

      // Rule: if citations are documentation only and status is demonstrated -> downgrade to partially_demonstrated
      if (
        finalStatus === "demonstrated" &&
        verifiedCitations.length > 0 &&
        verifiedCitations.every((c) => c.evidenceType === "doc")
      ) {
        finalStatus = "partially_demonstrated";
        downgradeReason = "Downgraded to partially_demonstrated: citations consist solely of documentation without working code";
      }

      evaluatedResults.push({
        requirementId: req.id,
        requirementText: req.text,
        status: finalStatus,
        rationale: parsedRationale,
        citedCandidateIds: citedIds,
        citations: verifiedCitations,
        limitations,
        nextActions,
        confidence: "medium",
        manuallyOverridden: false,
        downgradeReason,
      });
    }

    telemetries.push({
      stepName: "Step C & D: Model Evaluation & Citation Validation",
      status: "success",
      durationMs: Date.now() - stepCStart,
    });

    // --- Step E: Report Assembly & Coverage Telemetry ---
    const stepEStart = Date.now();
    const summary = {
      total: evaluatedResults.length,
      demonstrated: evaluatedResults.filter((r) => r.status === "demonstrated").length,
      partiallyDemonstrated: evaluatedResults.filter((r) => r.status === "partially_demonstrated").length,
      notDemonstrated: evaluatedResults.filter((r) => r.status === "not_demonstrated").length,
      needsReview: evaluatedResults.filter((r) => r.status === "needs_review").length,
    };

    const report: AssessmentReport = {
      id: `report_${input.runId}`,
      opportunityId: input.opportunityId,
      repositoryUrl: input.repositoryUrl,
      resolvedCommitSha: input.commitSha,
      status: "completed",
      assessments: evaluatedResults,
      coverageSummary: summary,
      scannedFilesCount: input.records.length,
      skippedFilesCount: 0,
      createdAt: new Date().toISOString(),
    };

    telemetries.push({
      stepName: "Step E: Report Assembly & Coverage Telemetry",
      status: "success",
      durationMs: Date.now() - stepEStart,
    });

    return {
      runId: input.runId,
      report,
      stepTelemetries: telemetries,
      totalDurationMs: Date.now() - overallStartTime,
    };
  }
}
