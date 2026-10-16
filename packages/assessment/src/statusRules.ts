import type { EvidenceStatus, Citation, Requirement } from "@parakh/contracts";
import type { CitationValidationOutcome } from "./validator.js";

/**
 * Conservative Status Assignment and Deterministic Downgrade Rules.
 *
 * Implements Parakh's core defense against hallucinated or ungrounded claims:
 * 1. Doc-Only Downgrade: README claims cannot grant 'demonstrated' without code or tests.
 * 2. Unverified Citation Downgrade: Missing or hallucinated citations trigger 'needs_review'.
 * 3. Objective Phrasing: 'not_demonstrated' explicitly means 'not found in supplied evidence'.
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
  const isDocOnly = validCitations.length > 0 && validCitations.every((c) => c.evidenceType === "doc");
  if (proposedStatus === "demonstrated" && isDocOnly) {
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
  const isConfigOnly = validCitations.length > 0 && validCitations.every((c) => c.evidenceType === "config");
  if (proposedStatus === "demonstrated" && isConfigOnly) {
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
