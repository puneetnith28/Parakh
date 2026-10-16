import { extractText, getDocumentProxy } from "unpdf";
import { config } from "../config.js";
import { TextSanitizer } from "./textSanitizer.js";

export interface ExtractedPdfDocument {
  text: string;
  numpages: number;
  characterCount: number;
  extractedAt: string;
}

export class PdfExtractor {
  private static readonly TIMEOUT_MS = 10000; // 10s hard timeout
  private static readonly MAX_PAGES = config.MAX_PDF_PAGES || 40;

  public static async extract(buffer: Buffer | Uint8Array): Promise<ExtractedPdfDocument> {
    if (!buffer || buffer.length === 0) {
      throw new Error("Cannot extract text from an empty PDF buffer");
    }

    // Timeout promise
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`PDF text extraction timed out after ${this.TIMEOUT_MS / 1000} seconds`));
      }, this.TIMEOUT_MS);
    });

    const extractionTask = (async () => {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const totalPages = pdf.numPages;

      if (totalPages > this.MAX_PAGES) {
        throw new Error(
          `PDF document exceeds the maximum limit of ${this.MAX_PAGES} pages (document has ${totalPages} pages)`
        );
      }

      const { text } = await extractText(pdf, { mergePages: true });
      const rawCombined = Array.isArray(text) ? text.join("\n\n") : text;
      const sanitized = TextSanitizer.sanitize(rawCombined);

      return {
        text: sanitized.sanitizedText,
        numpages: totalPages,
        characterCount: sanitized.characterCount,
        extractedAt: new Date().toISOString(),
      };
    })();

    try {
      const result = await Promise.race([extractionTask, timeoutPromise]);
      return result;
    } finally {
      clearTimeout(timer!);
    }
  }
}
