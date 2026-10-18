/**
 * ElevenLabs Audio Narration Adapter
 *
 * Converts candidate evaluation executive summary into high-fidelity voice narration.
 * Enforces strict timeout handling, input character capping, response size bounds,
 * and zero-credential leakage in errors and diagnostics.
 */

export interface ElevenLabsNarrationResult {
  success: boolean;
  audioBase64?: string;
  mimeType?: string;
  voiceId: string;
  byteLength?: number;
  durationEstimateSeconds?: number;
  skippedReason?: string;
  error?: string;
}

export interface ElevenLabsConfig {
  apiKey?: string;
  voiceId?: string;
  modelId?: string;
  timeoutMs?: number;
  maxCharacters?: number;
  fetchFn?: typeof fetch;
}

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel - professional narrative voice
const DEFAULT_MODEL_ID = "eleven_monolingual_v1";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_CHARACTERS = 1000;
const MAX_ALLOWED_AUDIO_BYTES = 5 * 1024 * 1024; // 5 MB safety ceiling

export class ElevenLabsAdapter {
  private readonly apiKey?: string;
  readonly voiceId: string;
  readonly modelId: string;
  readonly timeoutMs: number;
  readonly maxCharacters: number;
  private readonly fetch: typeof fetch;

  constructor(config: ElevenLabsConfig | string = {}) {
    if (typeof config === "string") {
      this.apiKey = config || process.env.ELEVENLABS_API_KEY;
      this.voiceId = DEFAULT_VOICE_ID;
      this.modelId = DEFAULT_MODEL_ID;
      this.timeoutMs = DEFAULT_TIMEOUT_MS;
      this.maxCharacters = DEFAULT_MAX_CHARACTERS;
      this.fetch = globalThis.fetch;
    } else {
      this.apiKey = config.apiKey || process.env.ELEVENLABS_API_KEY;
      this.voiceId = config.voiceId || DEFAULT_VOICE_ID;
      this.modelId = config.modelId || DEFAULT_MODEL_ID;
      this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
      this.maxCharacters = config.maxCharacters || DEFAULT_MAX_CHARACTERS;
      this.fetch = config.fetchFn || globalThis.fetch;
    }
  }

  public isEnabled(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Generates audio narration for assessment executive summaries.
   * Gracefully returns skipped status if key is absent or request fails.
   */
  public async narrateSummary(summaryText: string): Promise<ElevenLabsNarrationResult> {
    if (!this.isEnabled()) {
      return {
        success: false,
        voiceId: this.voiceId,
        skippedReason: "ELEVENLABS_API_KEY is not configured or disabled.",
      };
    }

    if (!summaryText || summaryText.trim().length === 0) {
      return {
        success: false,
        voiceId: this.voiceId,
        skippedReason: "Summary text is empty.",
      };
    }

    const sanitizedText = summaryText.trim().substring(0, this.maxCharacters);
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(this.voiceId)}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
            "xi-api-key": this.apiKey!,
          },
          body: JSON.stringify({
            text: sanitizedText,
            model_id: this.modelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      clearTimeout(timeoutHandle);

      if (!response.ok) {
        let reason = `ElevenLabs API returned HTTP ${response.status}`;
        if (response.status === 401) {
          reason = "ElevenLabs authentication failed (HTTP 401). Verify ELEVENLABS_API_KEY.";
        } else if (response.status === 429) {
          reason = "ElevenLabs rate limit or quota exceeded (HTTP 429).";
        }

        return {
          success: false,
          voiceId: this.voiceId,
          skippedReason: reason,
          error: reason,
        };
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_ALLOWED_AUDIO_BYTES) {
        return {
          success: false,
          voiceId: this.voiceId,
          skippedReason: `Generated audio exceeded safe size limit (${buffer.byteLength} bytes).`,
          error: "Oversized audio payload rejected.",
        };
      }

      const audioBase64 = Buffer.from(buffer).toString("base64");
      const wordCount = sanitizedText.split(/\s+/).filter(Boolean).length;
      const durationEstimateSeconds = Math.max(1, Math.ceil(wordCount / 2.5));

      return {
        success: true,
        voiceId: this.voiceId,
        mimeType: "audio/mpeg",
        audioBase64,
        byteLength: buffer.byteLength,
        durationEstimateSeconds,
      };
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      const isTimeout = err?.name === "AbortError" || controller.signal.aborted;
      const reason = isTimeout
        ? `ElevenLabs request timed out after ${this.timeoutMs}ms.`
        : `Audio generation failed: ${err?.message ? String(err.message).replace(this.apiKey || "", "[REDACTED]") : "Unknown error"}`;

      return {
        success: false,
        voiceId: this.voiceId,
        skippedReason: reason,
        error: reason,
      };
    }
  }
}

export const elevenLabsAdapter = new ElevenLabsAdapter();
