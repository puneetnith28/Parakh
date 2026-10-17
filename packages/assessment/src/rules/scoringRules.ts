import type { EvidenceStatus, Citation, Requirement } from "@parakh/contracts";
import type { CitationValidationOutcome } from "../validator.js";

/**
 * Parakh Conservative Status Downgrade Rules & Scoring Engine.
 *
 * Core defense against LLM hallucination and ungrounded capability claims:
 * 1. Zero evidence short-circuits to 'not_demonstrated' with objective phrasing.
 * 2. Unverified citations strictly downgrade positive claims to 'needs_review'.
 * 3. Doc-only evidence cannot substantiate 'demonstrated' and is downgraded to 'partially_demonstrated'.
 * 4. Config-only evidence is downgraded to 'partially_demonstrated'.
 * 5. Deterministic verification ensures only real file contents at verified line ranges count as evidence.
 */

export interface ResolveStatusParams {
  requirement: Requirement;
  proposedStatus: EvidenceStatus;
  proposedRationale: string;
  validationOutcome: CitationValidationOutcome;
  candidateUniverseCount: number;
}

export interface ResolvedStatusOutcome {
  finalStatus: EvidenceStatus;
  finalRationale: string;
  downgradeReason?: string;
  wasDowngraded: boolean;
  verifiedCitations: Citation[];
}

export function isDocOnlyCitations(citations: Citation[]): boolean {
  return citations.length > 0 && citations.every((c) => c.evidenceType === "doc");
}

export function isConfigOnlyCitations(citations: Citation[]): boolean {
  return citations.length > 0 && citations.every((c) => c.evidenceType === "config");
}

export function resolveAssessmentStatus(params: ResolveStatusParams): ResolvedStatusOutcome {
  const {
    proposedStatus,
    proposedRationale,
    validationOutcome,
    candidateUniverseCount,
  } = params;

  const validCitations = validationOutcome.validCitations;

  // Rule 0: Zero candidate snippets existed in the entire repository
  if (candidateUniverseCount === 0) {
    return {
      finalStatus: "not_demonstrated",
      finalRationale: "Not found in supplied repository evidence. No candidate files matched this technical requirement.",
      wasDowngraded: proposedStatus !== "not_demonstrated",
      downgradeReason: proposedStatus !== "not_demonstrated"
        ? "Downgraded to not_demonstrated: repository contains no candidate snippets matching requirement"
        : undefined,
      verifiedCitations: [],
    };
  }

  // Rule 1: Model proposed 'demonstrated' or 'partially_demonstrated' but has 0 valid citations
  if ((proposedStatus === "demonstrated" || proposedStatus === "partially_demonstrated") && validCitations.length === 0) {
    return {
      finalStatus: "needs_review",
      finalRationale: proposedRationale,
      downgradeReason: `Downgraded from ${proposedStatus} to needs_review: model made positive capability claim but provided zero verifiable citations.`,
      wasDowngraded: true,
      verifiedCitations: [],
    };
  }

  // Rule 2: Doc-Only Match Downgrade
  // README and documentation files cannot substantiate 'demonstrated' on their own
  if (proposedStatus === "demonstrated" && isDocOnlyCitations(validCitations)) {
    return {
      finalStatus: "partially_demonstrated",
      finalRationale: proposedRationale,
      downgradeReason:
        "Downgraded from demonstrated to partially_demonstrated: evidence consists exclusively of documentation claims without verifiable code or test suites.",
      wasDowngraded: true,
      verifiedCitations: validCitations,
    };
  }

  // Rule 3: Config-Only Match Downgrade
  if (proposedStatus === "demonstrated" && isConfigOnlyCitations(validCitations)) {
    return {
      finalStatus: "partially_demonstrated",
      finalRationale: proposedRationale,
      downgradeReason:
        "Downgraded from demonstrated to partially_demonstrated: manifest or configuration detected without verified implementation usage.",
      wasDowngraded: true,
      verifiedCitations: validCitations,
    };
  }

  // Rule 4: Preserved verified status
  return {
    finalStatus: proposedStatus,
    finalRationale: proposedRationale,
    wasDowngraded: false,
    verifiedCitations: validCitations,
  };
}
