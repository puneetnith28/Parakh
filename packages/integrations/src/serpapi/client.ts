/**
 * SerpApi External Documentation Lookup Service
 *
 * Provides optional reference documentation lookups for obscure third-party libraries
 * identified during repository analysis.
 *
 * CRITICAL INVARIANT:
 * External documentation is strictly tagged with `isCandidateEvidence: false` and
 * `sourceType: "external_reference_context"`. It is NEVER merged or treated as evidence
 * of candidate code capability.
 */

export interface ExternalDocResult {
  title: string;
  link: string;
  snippet: string;
  sourceType: "external_reference_context";
  isCandidateEvidence: false;
  timestamp: string;
}

export interface SerpApiSearchOptions {
  engine?: string;
  num?: number;
  timeoutMs?: number;
}

export class SerpApiClient {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SERPAPI_API_KEY;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Queries SerpApi Google Search engine for official library documentation.
   * Gracefully returns empty results if unconfigured or on network failure.
   */
  public async searchDocumentation(
    libraryOrTopic: string,
    options: SerpApiSearchOptions = {}
  ): Promise<ExternalDocResult[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const query = `${libraryOrTopic.trim()} documentation API reference`;
    const num = Math.min(options.num || 3, 5);
    const timeoutMs = options.timeoutMs || 4000;

    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("q", query);
    url.searchParams.set("engine", options.engine || "google");
    url.searchParams.set("num", String(num));
    url.searchParams.set("api_key", this.apiKey!);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[SerpApiClient] SerpApi request failed with status ${response.status}`);
        return [];
      }

      const data = (await response.json()) as any;
      const organicResults = Array.isArray(data.organic_results) ? data.organic_results : [];

      return organicResults.slice(0, num).map((item: any) => ({
        title: String(item.title || "External Documentation"),
        link: String(item.link || ""),
        snippet: String(item.snippet || ""),
        sourceType: "external_reference_context" as const,
        isCandidateEvidence: false as const,
        timestamp: new Date().toISOString(),
      }));
    } catch (err: any) {
      console.warn(`[SerpApiClient] Lookup failed gracefully: ${err.message}`);
      return [];
    }
  }
}

export const serpApiClient = new SerpApiClient();
