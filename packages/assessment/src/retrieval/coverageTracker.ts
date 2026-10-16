import type { RequirementCandidateUniverse } from "./candidateSelector.js";

/**
 * Retrieval Coverage and Diagnostic Auditing Tracker.
 *
 * Records telemetry across scanning and candidate retrieval phases:
 * files scanned, denylist exclusions, chunks created, requirements matched,
 * token usage, and partial truncation notices.
 */

export interface RetrievalCoverageAudit {
  runId: string;
  repository: string;
  commitSha: string;
  totalFilesScanned: number;
  filesExcludedByDenylist: number;
  eligibleFilesCount: number;
  totalChunksIndexed: number;
  totalRequirementsEvaluated: number;
  requirementsWithCandidatesCount: number;
  requirementsWithoutEvidenceCount: number;
  candidateCoverageRatio: number; // 0.0 to 1.0
  averageCandidatesPerRequirement: number;
  totalTokensEstimated: number;
  isTruncated: boolean;
  truncationNotice?: string;
  warnings: string[];
  generatedAt: string;
}

export interface ScanTelemetryParams {
  totalFilesScanned: number;
  filesExcludedByDenylist: number;
  eligibleFilesCount: number;
  totalChunksIndexed: number;
  isTruncated?: boolean;
  truncationNotice?: string;
  warnings?: string[];
}

export class CoverageTracker {
  private readonly runId: string;
  private readonly repository: string;
  private readonly commitSha: string;

  private totalFilesScanned = 0;
  private filesExcludedByDenylist = 0;
  private eligibleFilesCount = 0;
  private totalChunksIndexed = 0;
  private isTruncated = false;
  private truncationNotice?: string;
  private warnings: string[] = [];

  private candidateUniverses: RequirementCandidateUniverse[] = [];

  constructor(runId: string, repository: string, commitSha: string) {
    this.runId = runId;
    this.repository = repository;
    this.commitSha = commitSha;
  }

  /**
   * Record repository tree scanning and ingestion telemetry.
   */
  recordScanMetrics(params: ScanTelemetryParams): void {
    this.totalFilesScanned = params.totalFilesScanned;
    this.filesExcludedByDenylist = params.filesExcludedByDenylist;
    this.eligibleFilesCount = params.eligibleFilesCount;
    this.totalChunksIndexed = params.totalChunksIndexed;
    this.isTruncated = Boolean(params.isTruncated);
    this.truncationNotice = params.truncationNotice;
    if (params.warnings) {
      this.warnings.push(...params.warnings);
    }
  }

  /**
   * Record candidate selection outcomes for requirements.
   */
  recordRequirementResults(universes: RequirementCandidateUniverse[]): void {
    this.candidateUniverses.push(...universes);
  }

  /**
   * Add a runtime diagnostic warning.
   */
  addWarning(warning: string): void {
    this.warnings.push(warning);
  }

  /**
   * Finalize and calculate aggregate coverage diagnostics.
   */
  finalizeAudit(): RetrievalCoverageAudit {
    const totalReqs = this.candidateUniverses.length;
    let reqsWithCandidates = 0;
    let totalCandidates = 0;
    let totalTokens = 0;

    for (const u of this.candidateUniverses) {
      if (u.candidateCount > 0) {
        reqsWithCandidates++;
      }
      totalCandidates += u.candidateCount;
      totalTokens += u.totalTokensEstimated;
    }

    const reqsWithoutEvidence = totalReqs - reqsWithCandidates;
    const coverageRatio = totalReqs > 0 ? Number((reqsWithCandidates / totalReqs).toFixed(3)) : 0;
    const avgCandidates = totalReqs > 0 ? Number((totalCandidates / totalReqs).toFixed(2)) : 0;

    if (this.isTruncated && !this.truncationNotice) {
      this.truncationNotice = "Repository exceeded maximum scan bounds; partial scan performed.";
    }

    return {
      runId: this.runId,
      repository: this.repository,
      commitSha: this.commitSha,
      totalFilesScanned: this.totalFilesScanned,
      filesExcludedByDenylist: this.filesExcludedByDenylist,
      eligibleFilesCount: this.eligibleFilesCount,
      totalChunksIndexed: this.totalChunksIndexed,
      totalRequirementsEvaluated: totalReqs,
      requirementsWithCandidatesCount: reqsWithCandidates,
      requirementsWithoutEvidenceCount: reqsWithoutEvidence,
      candidateCoverageRatio: coverageRatio,
      averageCandidatesPerRequirement: avgCandidates,
      totalTokensEstimated: totalTokens,
      isTruncated: this.isTruncated,
      truncationNotice: this.truncationNotice,
      warnings: Array.from(new Set(this.warnings)),
      generatedAt: new Date().toISOString(),
    };
  }
}
