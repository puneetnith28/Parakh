/**
 * Mastra Agent Orchestration Scaffold & Workflows.
 */

export * from "./workflows/assessmentWorkflow.js";

export interface MastraWorkflowContext {
  runId: string;
  opportunityText?: string;
  repositoryUrl?: string;
  extractedRequirements?: unknown[];
  retrievedEvidence?: unknown[];
  assessmentResults?: unknown[];
}

export class MastraAgentOrchestrator {
  private isInitialized = false;

  constructor() {
    this.isInitialized = true;
  }

  public getStatus(): { initialized: boolean; provider: string } {
    return {
      initialized: this.isInitialized,
      provider: "gemma-orchestrated",
    };
  }
}

export const mastraOrchestrator = new MastraAgentOrchestrator();
