/**
 * Model Adapter Types and Normalized Provider Contracts.
 */

export type GemmaProviderType = "google-ai" | "huggingface" | "ollama" | "mock";

export interface ModelGenerationOptions {
  temperature?: number; // default: 0.1
  topP?: number; // default: 0.95
  maxOutputTokens?: number; // default: 2048
  timeoutMs?: number; // default: 30000
  systemInstruction?: string;
}

export interface ModelUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ModelGenerationResult {
  text: string;
  usage: ModelUsage;
  provider: GemmaProviderType;
  model: string;
  latencyMs: number;
  isMock: boolean;
}

export class ModelProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: GemmaProviderType,
    public readonly statusCode?: number,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = "ModelProviderError";
  }
}
