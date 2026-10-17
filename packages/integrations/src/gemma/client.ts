import { GemmaModelAdapter, type ModelAdapterConfig } from "./adapter.js";
import { buildExtractionPrompt } from "./prompts.js";
import type { ModelGenerationResult } from "./types.js";

/**
 * Gemma Inference Client with Conservative Low-Temperature Reasoning.
 *
 * Enforces conservative evaluation parameters (temperature 0.1, low topP)
 * to minimize hallucination and prevent unjustified positive claims.
 */

export interface GemmaClientConfig extends ModelAdapterConfig {
  temperature?: number; // strictly clamped to [0.0, 0.2]
  maxOutputTokens?: number;
}

export class GemmaClient {
  readonly adapter: GemmaModelAdapter;
  readonly temperature: number;
  readonly maxOutputTokens: number;

  constructor(config: GemmaClientConfig = {}) {
    // Clamp temperature strictly between 0.0 and 0.2 for conservative capability evaluation
    const requestedTemp = config.temperature ?? 0.1;
    this.temperature = Math.max(0.0, Math.min(0.2, requestedTemp));
    this.maxOutputTokens = config.maxOutputTokens ?? 2048;

    this.adapter = new GemmaModelAdapter({
      provider: config.provider,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      modelName: config.modelName || "gemma-2-9b-it",
      fetchFn: config.fetchFn,
    });
  }

  /**
   * Check model provider readiness and authentication status.
   */
  async checkReadiness(): Promise<{ ready: boolean; provider: string; model: string; message: string }> {
    try {
      const pingResult = await this.adapter.generateText('{"ping": true}', {
        timeoutMs: 5000,
        temperature: this.temperature,
      });

      return {
        ready: true,
        provider: this.adapter.provider,
        model: this.adapter.modelName,
        message: `Provider '${this.adapter.provider}' is ready (latency: ${pingResult.latencyMs}ms)`,
      };
    } catch (err: unknown) {
      return {
        ready: false,
        provider: this.adapter.provider,
        model: this.adapter.modelName,
        message: err instanceof Error ? err.message : "Model provider check failed",
      };
    }
  }

  /**
   * Execute prompt with enforced conservative safety settings and low temperature.
   */
  async executeConservativeReasoning(
    prompt: string,
    systemInstruction?: string
  ): Promise<ModelGenerationResult> {
    return this.adapter.generateText(prompt, {
      temperature: this.temperature,
      maxOutputTokens: this.maxOutputTokens,
      systemInstruction,
    });
  }

  /**
   * Extract verifiable technical requirements from raw opportunity brief text.
   */
  async extractRequirements(briefText: string): Promise<ModelGenerationResult> {
    const { systemPrompt, userPrompt } = buildExtractionPrompt(briefText);
    return this.executeConservativeReasoning(userPrompt, systemPrompt);
  }
}
