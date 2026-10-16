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
  scannedFiles: number;
  error?: string;
  history: StateTransitionRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export const VALID_TRANSITIONS: Record<RunStatus, RunStatus[]> = {
  INITIALIZED: ["INGESTING_REPO", "FAILED"],
  INGESTING_REPO: ["RETRIEVING_CHUNKS", "FAILED"],
  RETRIEVING_CHUNKS: ["ASSESSING", "FAILED"],
  ASSESSING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
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
    metadata?: { reportId?: string; error?: string; scannedFiles?: number; note?: string }
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
    if (metadata?.error) run.error = metadata.error;
    if (typeof metadata?.scannedFiles === "number") run.scannedFiles = metadata.scannedFiles;

    return run;
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
