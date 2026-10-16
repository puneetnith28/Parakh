export interface SanitizationResult {
  sanitizedText: string;
  originalLength: number;
  sanitizedLength: number;
  characterCount: number;
}

export class TextSanitizer {
  private static readonly MAX_CHARS = 50000;

  public static sanitize(rawText: unknown): SanitizationResult {
    if (typeof rawText !== "string") {
      throw new Error("Input must be a valid text string");
    }

    const trimmed = rawText.trim();
    if (!trimmed) {
      throw new Error("Opportunity text cannot be empty or whitespace only");
    }

    if (rawText.length > this.MAX_CHARS) {
      throw new Error(
        `Opportunity text exceeds maximum allowed limit of ${this.MAX_CHARS} characters (received ${rawText.length})`
      );
    }

    // Strip null bytes and dangerous control characters, preserving standard newlines and tabs
    // Control characters range: \x00-\x08, \x0B-\x0C, \x0E-\x1F, \x7F
    const cleaned = rawText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .normalize("NFC");

    return {
      sanitizedText: cleaned.trim(),
      originalLength: rawText.length,
      sanitizedLength: cleaned.trim().length,
      characterCount: cleaned.trim().length,
    };
  }
}
