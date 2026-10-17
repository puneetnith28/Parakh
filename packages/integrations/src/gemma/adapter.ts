import {
  type GemmaProviderType,
  type ModelGenerationOptions,
  type ModelGenerationResult,
  ModelProviderError,
} from "./types.js";

/**
 * Unified Gemma Model Provider Adapter.
 *
 * Implements resilient inference routing across Google AI Studio, Hugging Face,
 * local Ollama, and test mocks with timeout enforcement and error normalization.
 */

export interface ModelAdapterConfig {
  provider?: GemmaProviderType;
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  fetchFn?: typeof fetch;
}

export class GemmaModelAdapter {
  readonly provider: GemmaProviderType;
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  readonly modelName: string;
  private readonly fetch: typeof fetch;

  constructor(config: ModelAdapterConfig = {}) {
    this.apiKey =
      config.apiKey ||
      process.env.MODEL_API_KEY ||
      process.env.AI_STUDIO_API_KEY ||
      process.env.GEMINI_API_KEY;
    this.provider = config.provider || (this.apiKey ? "google-ai" : "mock");
    this.modelName = config.modelName || "gemma-2-9b-it";
    this.baseUrl = config.baseUrl || this.getDefaultBaseUrl(this.provider);
    this.fetch = config.fetchFn || globalThis.fetch;
  }

  private getDefaultBaseUrl(provider: GemmaProviderType): string {
    switch (provider) {
      case "google-ai":
        return "https://generativelanguage.googleapis.com/v1beta";
      case "huggingface":
        return "https://api-inference.huggingface.co/models";
      case "ollama":
        return "http://localhost:11434/api";
      case "mock":
      default:
        return "mock://gemma";
    }
  }

  /**
   * Execute model inference with timeout boundaries and error normalization.
   */
  async generateText(
    prompt: string,
    options: ModelGenerationOptions = {}
  ): Promise<ModelGenerationResult> {
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs ?? 30000;
    const temperature = options.temperature ?? 0.1;

    // Handle mock provider directly
    if (this.provider === "mock") {
      return {
        text: JSON.stringify({
          status: "demonstrated",
          rationale: "Mock response generated for test environment",
          citedCandidateIds: ["cand_001"],
          limitations: "None in mock",
          nextActions: ["Proceed with report generation"],
        }),
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
        provider: "mock",
        model: this.modelName,
        latencyMs: Date.now() - startTime,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (this.provider === "google-ai") {
        return await this.invokeGoogleAi(prompt, options, controller.signal, startTime, temperature);
      } else if (this.provider === "huggingface") {
        return await this.invokeHuggingFace(prompt, options, controller.signal, startTime, temperature);
      } else if (this.provider === "ollama") {
        return await this.invokeOllama(prompt, options, controller.signal, startTime, temperature);
      }

      throw new ModelProviderError(`Unsupported provider: ${this.provider}`, this.provider, 400);
    } catch (err: unknown) {
      if (err instanceof ModelProviderError) {
        throw err;
      }

      const isTimeout = (err as Error).name === "AbortError";
      const message = isTimeout
        ? `Model inference request timed out after ${timeoutMs}ms`
        : (err as Error).message;

      throw new ModelProviderError(message, this.provider, isTimeout ? 504 : 500, isTimeout);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async invokeGoogleAi(
    prompt: string,
    options: ModelGenerationOptions,
    signal: AbortSignal,
    startTime: number,
    temperature: number
  ): Promise<ModelGenerationResult> {
    if (!this.apiKey) {
      throw new ModelProviderError("Missing MODEL_API_KEY for Google AI provider", "google-ai", 401, false);
    }

    const endpoint = `${this.baseUrl}/models/${this.modelName}:generateContent?key=${this.apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        topP: options.topP ?? 0.95,
        maxOutputTokens: options.maxOutputTokens ?? 2048,
        responseMimeType: "application/json",
      },
      systemInstruction: options.systemInstruction
        ? { parts: [{ text: options.systemInstruction }] }
        : undefined,
    };

    const response = await this.fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const isRetryable = response.status === 429 || response.status >= 500;
      throw new ModelProviderError(
        `Google AI inference error HTTP ${response.status}: ${errorText}`,
        "google-ai",
        response.status,
        isRetryable
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const promptTokens = data.usageMetadata?.promptTokenCount || 0;
    const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;

    return {
      text,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      provider: "google-ai",
      model: this.modelName,
      latencyMs: Date.now() - startTime,
    };
  }

  private async invokeHuggingFace(
    prompt: string,
    options: ModelGenerationOptions,
    signal: AbortSignal,
    startTime: number,
    temperature: number
  ): Promise<ModelGenerationResult> {
    const endpoint = `${this.baseUrl}/${this.modelName}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await this.fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          temperature,
          max_new_tokens: options.maxOutputTokens ?? 2048,
          return_full_text: false,
        },
      }),
      signal,
    });

    if (!response.ok) {
      throw new ModelProviderError(
        `HuggingFace inference error HTTP ${response.status}`,
        "huggingface",
        response.status,
        response.status === 429 || response.status >= 500
      );
    }

    const result = (await response.json()) as Array<{ generated_text: string }>;
    const text = result[0]?.generated_text || "";

    return {
      text,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      provider: "huggingface",
      model: this.modelName,
      latencyMs: Date.now() - startTime,
    };
  }

  private async invokeOllama(
    prompt: string,
    options: ModelGenerationOptions,
    signal: AbortSignal,
    startTime: number,
    temperature: number
  ): Promise<ModelGenerationResult> {
    const endpoint = `${this.baseUrl}/generate`;
    const response = await this.fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.modelName,
        prompt,
        stream: false,
        options: {
          temperature,
          num_predict: options.maxOutputTokens ?? 2048,
        },
      }),
      signal,
    });

    if (!response.ok) {
      throw new ModelProviderError(`Ollama inference error HTTP ${response.status}`, "ollama", response.status);
    }

    const data = (await response.json()) as { response: string };
    return {
      text: data.response || "",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      provider: "ollama",
      model: this.modelName,
      latencyMs: Date.now() - startTime,
    };
  }
}
