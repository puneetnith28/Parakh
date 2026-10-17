/**
 * Canonical Assessment Evaluator Engine
 *
 * Primary business-logic path for executing requirement assessment,
 * candidate evidence selection, model reasoning, deterministic citation
 * validation, and conservative status assignment.
 */

import {
  type Requirement,
  type EvidenceRecord,
  type RequirementAssessment,
  type EvidenceStatus,
} from "@parakh/contracts";
import { CandidateSelector, type RequirementCandidateUniverse } from "./retrieval/candidateSelector.js";
import { IndexManager } from "./retrieval/indexManager.js";
import { CitationValidator } from "./validator.js";
import { resolveAssessmentStatus } from "./statusRules.js";

export interface EvaluatorOptions {
  maxCandidates?: number;
}

export interface EvaluateRequirementInput {
  requirement: Requirement;
  universe: RequirementCandidateUniverse;
  modelEvaluator?: (req: Requirement, universe: RequirementCandidateUniverse) => Promise<{
    status: EvidenceStatus;
    rationale: string;
    citedCandidateIds: string[];
    limitations?: string;
    nextActions?: string[];
  }>;
}

export class CanonicalAssessmentEvaluator {
  private readonly candidateSelector: CandidateSelector;
  private readonly indexManager: IndexManager;
  private readonly validator: CitationValidator;

  constructor(options: EvaluatorOptions = {}) {
    this.candidateSelector = new CandidateSelector({ maxCandidates: options.maxCandidates ?? 5 });
    this.indexManager = new IndexManager();
    this.validator = new CitationValidator();
  }

  /**
   * Selects candidate evidence universes for all supplied requirements.
   */
  public selectCandidateUniverses(
    requirements: Requirement[],
    records: EvidenceRecord[]
  ): Map<string, RequirementCandidateUniverse> {
    const repo = records[0]?.repository || "unknown/repo";
    const sha = records[0]?.commitSha || "0000000000000000000000000000000000000000";
    const index = this.indexManager.createIndex(repo, sha, records);
    const map = new Map<string, RequirementCandidateUniverse>();
    for (const req of requirements) {
      const universe = this.candidateSelector.selectCandidates(req, index);
      map.set(req.id, universe);
    }
    return map;
  }

  /**
   * Default deterministic fallback model evaluator when no remote model is configured.
   */
  public async defaultLocalEvaluator(
    requirement: Requirement,
    universe: RequirementCandidateUniverse
  ): Promise<{
    status: EvidenceStatus;
    rationale: string;
    citedCandidateIds: string[];
    limitations?: string;
    nextActions?: string[];
  }> {
    if (universe.candidates.length === 0) {
      return {
        status: "not_demonstrated",
        rationale: `No candidate code or documentation matching '${requirement.text}' was found in the analyzed repository files.`,
        citedCandidateIds: [],
        nextActions: [`Implement ${requirement.text} in repository source files`],
      };
    }

    const hasCodeCandidate = universe.candidates.some(
      (c) => c.fileType === "source" || c.fileType === "test"
    );
    const hasTestCandidate = universe.candidates.some((c) => c.fileType === "test");

    if (hasCodeCandidate && hasTestCandidate) {
      return {
        status: "demonstrated",
        rationale: `Requirement '${requirement.text}' is substantiated by implementation and automated tests.`,
        citedCandidateIds: universe.candidates.slice(0, 2).map((c) => c.candidateId),
        nextActions: [],
      };
    }

    if (hasCodeCandidate) {
      return {
        status: "partially_demonstrated",
        rationale: `Implementation for '${requirement.text}' exists in source code, but automated test coverage was not detected.`,
        citedCandidateIds: universe.candidates.slice(0, 1).map((c) => c.candidateId),
        nextActions: [`Add dedicated unit or integration tests verifying ${requirement.text}`],
      };
    }

    return {
      status: "needs_review",
      rationale: `Only documentation or configuration references were found for '${requirement.text}'.`,
      citedCandidateIds: universe.candidates.slice(0, 1).map((c) => c.candidateId),
      nextActions: [`Implement executable logic beyond documentation`],
    };
  }

  /**
   * Evaluates a single requirement with citation validation and conservative status downgrading.
   */
  public async evaluateRequirement(
    input: EvaluateRequirementInput,
    allRecords: EvidenceRecord[]
  ): Promise<RequirementAssessment> {
    const { requirement, universe, modelEvaluator } = input;

    const evalFn = modelEvaluator || this.defaultLocalEvaluator.bind(this);
    const rawResult = await evalFn(requirement, universe);

    // Enforce deterministic citation validation against real repository records
    const validationOutcome = this.validator.validate(
      rawResult.citedCandidateIds,
      universe.candidates,
      allRecords
    );

    // Enforce conservative status assignment and downgrade rules
    const resolved = resolveAssessmentStatus({
      requirement,
      proposedStatus: rawResult.status,
      proposedRationale: rawResult.rationale,
      validationOutcome,
      candidateUniverseCount: universe.candidates.length,
    });

    return {
      requirementId: requirement.id,
      requirementText: requirement.text,
      status: resolved.finalStatus,
      rationale: resolved.finalRationale,
      citedCandidateIds: resolved.verifiedCitations.map((c) => c.candidateId),
      citations: resolved.verifiedCitations,
      limitations: rawResult.limitations,
      nextActions: rawResult.nextActions || [],
      confidence: resolved.wasDowngraded ? "low" : "high",
      manuallyOverridden: false,
      originalStatus: resolved.wasDowngraded ? rawResult.status : undefined,
      downgradeReason: resolved.downgradeReason,
    };
  }

  /**
   * Evaluates an entire batch of requirements against repository evidence.
   */
  public async evaluateBatch(
    requirements: Requirement[],
    records: EvidenceRecord[],
    modelEvaluator?: EvaluateRequirementInput["modelEvaluator"]
  ): Promise<RequirementAssessment[]> {
    const universes = this.selectCandidateUniverses(requirements, records);
    const results: RequirementAssessment[] = [];

    for (const req of requirements) {
      const universe: RequirementCandidateUniverse = universes.get(req.id) || {
        requirementId: req.id,
        requirementText: req.text,
        candidates: [],
        totalTokensEstimated: 0,
        candidateCount: 0,
      };

      const assessment = await this.evaluateRequirement(
        {
          requirement: req,
          universe,
          modelEvaluator,
        },
        records
      );
      results.push(assessment);
    }

    return results;
  }
}
