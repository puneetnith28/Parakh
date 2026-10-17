import { RunStatus } from "../storage/models/AnalysisRun.js";

export interface StateTransitionRecord {
  status: RunStatus;
  timestamp: Date;
  note?: string;
}

export interface AnalysisRunState {
  runId: string;
  opportunityId: string;
  repositoryUrl: string;
  idempotencyKey?: string;
  status: RunStatus;
  reportId?: string;
  reportContentHash?: string;
  cancelled?: boolean;
  cancellationReason?: string;
  scannedFiles: number;
  error?: string;
  history: StateTransitionRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export const VALID_TRANSITIONS: Record<RunStatus, RunStatus[]> = {
  INITIALIZED: ["INGESTING_REPO", "COMPLETED", "FAILED", "CANCELLED"],
  INGESTING_REPO: ["RETRIEVING_CHUNKS", "FAILED", "CANCELLED"],
  RETRIEVING_CHUNKS: ["ASSESSING", "FAILED", "CANCELLED"],
  ASSESSING: ["COMPLETED", "FAILED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  FAILED: [],
};

export class RunManager {
  private runs = new Map<string, AnalysisRunState>();
  private idempotencyIndex = new Map<string, string>(); // idempotencyKey -> runId

  /**
   * Initializes a run or returns the existing run if idempotencyKey has already been presented.
   */
  createOrGetRun(params: {
    runId: string;
    opportunityId: string;
    repositoryUrl: string;
    idempotencyKey?: string;
  }): { run: AnalysisRunState; isNew: boolean } {
    if (params.idempotencyKey) {
      const existingRunId = this.idempotencyIndex.get(params.idempotencyKey);
      if (existingRunId) {
        const existingRun = this.runs.get(existingRunId);
        if (existingRun) {
          return { run: existingRun, isNew: false };
        }
      }
    }

    const now = new Date();
    const run: AnalysisRunState = {
      runId: params.runId,
      opportunityId: params.opportunityId,
      repositoryUrl: params.repositoryUrl,
      idempotencyKey: params.idempotencyKey,
      status: "INITIALIZED",
      scannedFiles: 0,
      history: [{ status: "INITIALIZED", timestamp: now }],
      createdAt: now,
      updatedAt: now,
    };

    this.runs.set(params.runId, run);
    if (params.idempotencyKey) {
      this.idempotencyIndex.set(params.idempotencyKey, params.runId);
    }

    return { run, isNew: true };
  }

  /**
   * Executes a verified state machine transition.
   * Throws Error if illegal state transition is attempted.
   */
  transitionState(
    runId: string,
    nextStatus: RunStatus,
    metadata?: {
      reportId?: string;
      reportContentHash?: string;
      error?: string;
      scannedFiles?: number;
      note?: string;
    }
  ): AnalysisRunState {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Analysis run ${runId} does not exist.`);
    }

    const allowed = VALID_TRANSITIONS[run.status];
    if (!allowed.includes(nextStatus)) {
      throw new Error(
        `Invalid state transition: Cannot transition run ${runId} from ${run.status} to ${nextStatus}.`
      );
    }

    const now = new Date();
    run.status = nextStatus;
    run.updatedAt = now;
    run.history.push({
      status: nextStatus,
      timestamp: now,
      note: metadata?.note,
    });

    if (metadata?.reportId) run.reportId = metadata.reportId;
    if (metadata?.reportContentHash) run.reportContentHash = metadata.reportContentHash;
    if (metadata?.error) run.error = metadata.error;
    if (typeof metadata?.scannedFiles === "number") run.scannedFiles = metadata.scannedFiles;

    return run;
  }

  /**
   * Cancels an active analysis run.
   */
  cancelRun(runId: string, reason: string = "Cancelled by client"): AnalysisRunState {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Analysis run ${runId} does not exist.`);
    }

    if (run.status === "COMPLETED" || run.status === "FAILED" || run.status === "CANCELLED") {
      return run;
    }

    run.cancelled = true;
    run.cancellationReason = reason;
    return this.transitionState(runId, "CANCELLED", { note: reason });
  }

  /**
   * Checks whether an analysis run has been cancelled.
   */
  isCancelled(runId: string): boolean {
    const run = this.runs.get(runId);
    return Boolean(run?.cancelled || run?.status === "CANCELLED");
  }

  getRun(runId: string): AnalysisRunState | null {
    return this.runs.get(runId) || null;
  }

  getRunByIdempotencyKey(key: string): AnalysisRunState | null {
    const runId = this.idempotencyIndex.get(key);
    return runId ? this.runs.get(runId) || null : null;
  }

  clear(): void {
    this.runs.clear();
    this.idempotencyIndex.clear();
  }
}

export const runManager = new RunManager();
