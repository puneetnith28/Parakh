/**
 * Temporal Durable Execution Workflow Prototype for Parakh.
 *
 * This module defines the architectural scaffold and activity retry policies
 * for long-running, multi-repository capability assessments.
 */

export interface AssessmentWorkflowInput {
  assessmentId: string;
  candidateId: string;
  repoUrl: string;
  branch?: string;
  depth?: "standard" | "exhaustive";
  idempotencyKey: string;
}

export interface ActivityRetryPolicy {
  initialIntervalMs: number;
  backoffCoefficient: number;
  maximumIntervalMs: number;
  maximumAttempts: number;
  nonRetryableErrorTypes: string[];
}

export interface WorkflowActivityDefinition<TInput, TOutput> {
  name: string;
  timeoutMs: number;
  retryPolicy: ActivityRetryPolicy;
  execute: (input: TInput) => Promise<TOutput>;
}

export interface AssessmentWorkflowState {
  workflowId: string;
  runId: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "TIMED_OUT";
  completedSteps: string[];
  currentStep?: string;
  error?: string;
  startedAt: string;
  updatedAt: string;
}

export const DEFAULT_ACTIVITY_RETRY_POLICY: ActivityRetryPolicy = {
  initialIntervalMs: 1000,
  backoffCoefficient: 2.0,
  maximumIntervalMs: 30000,
  maximumAttempts: 5,
  nonRetryableErrorTypes: [
    "REPOSITORY_NOT_FOUND",
    "INVALID_CREDENTIALS",
    "UNAUTHORIZED_ACCESS",
    "INVALID_ARGUMENT",
  ],
};

export const WORKFLOW_ACTIVITIES = {
  CLONE_AND_INSPECT: "cloneAndInspectRepo",
  EXTRACT_AST_AND_METRICS: "extractAstAndMetrics",
  RETRIEVE_CONTEXT: "retrieveGroundTruthContext",
  EVALUATE_DIMENSIONS: "evaluateDimensionsWithGemma",
  PERSIST_REPORT: "persistReportAndBadges",
} as const;

/**
 * Workflow execution engine simulator and contract definition
 * ensuring compatibility with standard Temporal SDK workers (@temporalio/workflow / @temporalio/activity).
 */
export class AssessmentDurableWorkflow {
  private state: AssessmentWorkflowState;

  constructor(private input: AssessmentWorkflowInput) {
    this.state = {
      workflowId: `parakh-assessment-${input.assessmentId}`,
      runId: `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: "PENDING",
      completedSteps: [],
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  public getState(): AssessmentWorkflowState {
    return { ...this.state };
  }

  /**
   * Executes a durable step with simulated checkpointing and invariant validation.
   */
  public async executeStep<T>(
    stepName: string,
    action: () => Promise<T>
  ): Promise<T> {
    this.state.status = "RUNNING";
    this.state.currentStep = stepName;
    this.state.updatedAt = new Date().toISOString();

    try {
      const result = await action();
      this.state.completedSteps.push(stepName);
      this.state.currentStep = undefined;
      this.state.updatedAt = new Date().toISOString();
      return result;
    } catch (err: any) {
      this.state.status = "FAILED";
      this.state.error = err?.message || String(err);
      this.state.updatedAt = new Date().toISOString();
      throw err;
    }
  }

  public completeWorkflow(): void {
    if (this.state.status !== "FAILED") {
      this.state.status = "COMPLETED";
      this.state.updatedAt = new Date().toISOString();
    }
  }
}
