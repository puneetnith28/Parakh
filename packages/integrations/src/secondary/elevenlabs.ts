/**
 * ElevenLabs Audio Narration Adapter
 *
 * Converts candidate evaluation executive summary into high-fidelity voice narration.
 */

export interface ElevenLabsNarrationResult {
  success: boolean;
  audioBase64?: string;
  voiceId: string;
  durationEstimateSeconds?: number;
  skippedReason?: string;
}

export class ElevenLabsAdapter {
  private apiKey?: string;
  private voiceId: string;

  constructor(apiKey?: string, voiceId = "21m00Tcm4TlvDq8ikWAM") {
    this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY;
    this.voiceId = voiceId;
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

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": this.apiKey!,
          },
          body: JSON.stringify({
            text: summaryText.substring(0, 1000), // Narration cap for quota safety
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        return {
          success: false,
          voiceId: this.voiceId,
          skippedReason: `ElevenLabs API returned HTTP ${response.status}`,
        };
      }

      const buffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(buffer).toString("base64");

      return {
        success: true,
        voiceId: this.voiceId,
        audioBase64,
        durationEstimateSeconds: Math.ceil(summaryText.split(" ").length / 2.5),
      };
    } catch (err: any) {
      return {
        success: false,
        voiceId: this.voiceId,
        skippedReason: `Audio generation failed: ${err.message}`,
      };
    }
  }
}

export const elevenLabsAdapter = new ElevenLabsAdapter();
