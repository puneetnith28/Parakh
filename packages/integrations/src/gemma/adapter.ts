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
    const rawProvider =
      config.provider ||
      process.env.MODEL_PROVIDER ||
      (this.apiKey ? "google-ai" : "mock");
    this.provider =
      rawProvider === "google" || rawProvider === "google-ai"
        ? "google-ai"
        : rawProvider === "huggingface"
        ? "huggingface"
        : rawProvider === "ollama"
        ? "ollama"
        : "mock";
    this.modelName = config.modelName || process.env.MODEL_NAME || "gemma-2-9b-it";
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
      const isEvaluation =
        prompt.includes("CANDIDATE REPOSITORY EVIDENCE:") ||
        prompt.includes("TECHNICAL REQUIREMENT TO EVALUATE:") ||
        Boolean(options.systemInstruction && /Evaluator|Candidate Evidence|DEMONSTRATED/i.test(options.systemInstruction));

      const isExtraction =
        !isEvaluation &&
        (prompt.includes("<opportunity_brief>") ||
          Boolean(options.systemInstruction && /extract/i.test(options.systemInstruction)));

      if (isExtraction) {
        const briefMatch = prompt.match(/<opportunity_brief>([\s\S]*?)<\/opportunity_brief>/i);
        const briefContent = briefMatch ? briefMatch[1].trim() : prompt;

        const requirements = [];
        let reqIdx = 1;

        if (/react|frontend|ui|user interface|html|css|tailwind|vue/i.test(briefContent)) {
          requirements.push({
            id: `req_${String(reqIdx++).padStart(3, "0")}`,
            text: "Develop responsive and accessible web frontend interface",
            category: "frontend" as const,
            priority: "mandatory" as const,
            acceptanceCriteria: ["Frontend components render cleanly across viewports"],
          });
        }
        if (/api|backend|node|express|endpoint|service|server|python|fastapi/i.test(briefContent)) {
          requirements.push({
            id: `req_${String(reqIdx++).padStart(3, "0")}`,
            text: "Implement backend service endpoints with validation and error handling",
            category: "backend" as const,
            priority: "mandatory" as const,
            acceptanceCriteria: ["Endpoints validate inputs and return structured error codes"],
          });
        }
        if (/postgres|database|sql|mongo|storage|schema|migrations/i.test(briefContent)) {
          requirements.push({
            id: `req_${String(reqIdx++).padStart(3, "0")}`,
            text: "Configure persistent database schema and data integrity constraints",
            category: "database" as const,
            priority: "mandatory" as const,
            acceptanceCriteria: ["Schemas defined with migrations and primary keys"],
          });
        }
        if (/docker|container|ci\/cd|deploy|render|devops|pipeline/i.test(briefContent)) {
          requirements.push({
            id: `req_${String(reqIdx++).padStart(3, "0")}`,
            text: "Containerize application with Docker and configure CI/CD pipeline",
            category: "devops" as const,
            priority: "preferred" as const,
            acceptanceCriteria: ["Dockerfile builds cleanly and CI executes test suites"],
          });
        }
        if (/test|jest|playwright|e2e|unit test/i.test(briefContent)) {
          requirements.push({
            id: `req_${String(reqIdx++).padStart(3, "0")}`,
            text: "Implement comprehensive automated unit and integration tests",
            category: "testing" as const,
            priority: "mandatory" as const,
            acceptanceCriteria: ["Unit tests run without failure and cover critical paths"],
          });
        }

        if (requirements.length === 0) {
          requirements.push(
            {
              id: "req_001",
              text: "Implement core system architecture and data processing logic",
              category: "architecture" as const,
              priority: "mandatory" as const,
              acceptanceCriteria: ["Core processing pipeline executes end-to-end"],
            },
            {
              id: "req_002",
              text: "Provide automated test verification for business logic",
              category: "testing" as const,
              priority: "mandatory" as const,
              acceptanceCriteria: ["Automated tests verify system behavior"],
            }
          );
        }

        return {
          text: JSON.stringify({
            summary: "Extracted technical requirements from client opportunity brief",
            requirements,
          }),
          usage: { promptTokens: 120, completionTokens: 80, totalTokens: 200 },
          provider: "mock",
          model: this.modelName === "gemma-2-9b-it" ? "mock-extractor" : this.modelName,
          latencyMs: Date.now() - startTime,
          isMock: true,
        };
      }

      const candidateIdMatch = prompt.match(/candidateId="([^"]+)"/);
      const citedCandidateId = candidateIdMatch ? candidateIdMatch[1] : "cand_001";

      return {
        text: JSON.stringify({
          status: "demonstrated",
          rationale: "Mock response generated for test environment",
          citedCandidateIds: [citedCandidateId],
          limitations: "None in mock",
          nextActions: ["Proceed with report generation"],
        }),
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
        provider: "mock",
        model: this.modelName === "gemma-2-9b-it" ? "mock-evaluator" : this.modelName,
        latencyMs: Date.now() - startTime,
        isMock: true,
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
      isMock: false,
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
      isMock: false,
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
      isMock: false,
    };
  }
}
