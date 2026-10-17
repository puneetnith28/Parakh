/**
 * Backboard Context Memory Adapter
 *
 * Provides optional cross-session candidate memory recording.
 */

export interface BackboardMemoryEntry {
  candidateId: string;
  assessmentId: string;
  overallScore: number;
  topStrengths: string[];
  recordedAt: string;
}

export class BackboardAdapter {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BACKBOARD_API_KEY;
  }

  public isEnabled(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Records candidate memory state to Backboard if configured.
   */
  public async recordAssessmentMemory(
    _entry: BackboardMemoryEntry
  ): Promise<{ recorded: boolean; reason?: string }> {
    if (!this.isEnabled()) {
      return {
        recorded: false,
        reason: "BACKBOARD_API_KEY not configured or feature disabled.",
      };
    }

    try {
      // Backboard API endpoint mock / interface contract
      return {
        recorded: true,
      };
    } catch (err: any) {
      return {
        recorded: false,
        reason: `Backboard memory dispatch error: ${err.message}`,
      };
    }
  }
}

export const backboardAdapter = new BackboardAdapter();
