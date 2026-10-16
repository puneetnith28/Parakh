import { ZodSchema, ZodError } from "zod";

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  cleanedText?: string;
}

export class ModelParser {
  /**
   * Strips markdown fences, surrounding text, and extracts the primary JSON payload
   */
  public static extractJsonString(rawOutput: string): string {
    if (!rawOutput || typeof rawOutput !== "string") {
      throw new Error("Cannot parse empty or non-string model output");
    }

    let cleaned = rawOutput.trim();

    // 1. Remove markdown code fences if present (e.g. ```json ... ``` or ``` ...)
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch && fenceMatch[1]) {
      cleaned = fenceMatch[1].trim();
    } else {
      // 2. If no fences, find the first '{' and last '}'
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
      }
    }

    return cleaned;
  }

  /**
   * Sanitizes common LLM JSON syntax imperfections (e.g., trailing commas)
   */
  public static repairJsonSyntax(jsonStr: string): string {
    return jsonStr
      // Remove trailing commas in objects or arrays: , } -> } and , ] -> ]
      .replace(/,\s*([}\]])/g, "$1")
      // Remove carriage returns
      .replace(/\r/g, "");
  }

  /**
   * Validates and parses raw text against a Zod schema
   */
  public static parseWithSchema<T>(rawOutput: string, schema: ZodSchema<T>): ParseResult<T> {
    try {
      const extracted = this.extractJsonString(rawOutput);
      const repaired = this.repairJsonSyntax(extracted);
      const parsedObj = JSON.parse(repaired);
      const validated = schema.parse(parsedObj);
      return {
        success: true,
        data: validated,
        cleanedText: repaired,
      };
    } catch (err: any) {
      let errorMessage = err.message || "Failed to parse model output";
      if (err instanceof ZodError) {
        errorMessage = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Executes a model generation task with up to 1 bounded retry if parsing or schema validation fails
   */
  public static async executeWithBoundedRetry<T>(
    generateFn: (prompt: string) => Promise<string>,
    initialPrompt: string,
    schema: ZodSchema<T>,
    maxRetries = 1
  ): Promise<T> {
    let currentPrompt = initialPrompt;
    let attempts = 0;

    while (attempts <= maxRetries) {
      attempts++;
      const rawResponse = await generateFn(currentPrompt);
      const result = this.parseWithSchema(rawResponse, schema);

      if (result.success && result.data) {
        return result.data;
      }

      if (attempts <= maxRetries) {
        // Construct targeted correction prompt
        currentPrompt = `${initialPrompt}\n\nCRITICAL ERROR IN PREVIOUS RESPONSE:
The previous response failed schema validation with error: "${result.error}".
Please re-output ONLY valid JSON adhering strictly to the schema specification with no markdown commentary or formatting errors.`;
      } else {
        throw new Error(
          `Model output parsing failed after ${attempts} attempts. Schema error: ${result.error}`
        );
      }
    }

    throw new Error("Exhausted model retries");
  }
}
