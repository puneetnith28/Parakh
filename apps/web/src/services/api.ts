import { Requirement, ExtractedRequirementsResult } from "@parakh/contracts";
import { getApiUrl } from "../config/api.ts";

export interface ExtractionApiResponse {
  status: "success" | "error";
  opportunity?: {
    id: string;
    title: string;
    rawText: string;
    characterCount: number;
    createdAt: string;
  };
  extraction?: ExtractedRequirementsResult;
  metadata?: {
    provider: string;
    model: string;
    latencyMs: number;
    isMock: boolean;
    requirementCount: number;
  };
  message?: string;
}

export async function extractRequirementsFromText(
  text: string,
  title?: string
): Promise<{ requirements: Requirement[]; summary?: string; isMock?: boolean }> {
  const res = await fetch(getApiUrl("/api/opportunity/text"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, title }),
  });

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as ExtractionApiResponse;
    throw new Error(errorData.message || `Failed to extract requirements: HTTP ${res.status}`);
  }

  const data = (await res.json()) as ExtractionApiResponse;
  if (!data.extraction || !Array.isArray(data.extraction.requirements)) {
    throw new Error("Invalid response format from extraction API");
  }

  return {
    requirements: data.extraction.requirements,
    summary: data.extraction.summary,
    isMock: data.metadata?.isMock,
  };
}

export async function extractRequirementsFromPdf(
  file: File
): Promise<{ requirements: Requirement[]; summary?: string; isMock?: boolean }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(getApiUrl("/api/opportunity/pdf"), {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as ExtractionApiResponse;
    throw new Error(errorData.message || `Failed to extract requirements from PDF: HTTP ${res.status}`);
  }

  const data = (await res.json()) as ExtractionApiResponse;
  if (!data.extraction || !Array.isArray(data.extraction.requirements)) {
    throw new Error("Invalid response format from extraction API");
  }

  return {
    requirements: data.extraction.requirements,
    summary: data.extraction.summary,
    isMock: data.metadata?.isMock,
  };
}

export interface AnalysisApiResponse {
  status: "success" | "error";
  report?: any;
  metadata?: {
    opportunityTitle?: string;
    modelProvider?: string;
    isMock?: boolean;
    filesScanned?: number;
  };
  message?: string;
}

export async function runAssessmentAnalysis(params: {
  opportunityId?: string;
  title?: string;
  repositoryUrl: string;
  requirements: Requirement[];
  timeoutMs?: number;
}): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), params.timeoutMs ?? 180000);

  try {
    const res = await fetch(getApiUrl("/api/analysis"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opportunityId: params.opportunityId,
        title: params.title,
        repositoryUrl: params.repositoryUrl,
        requirements: params.requirements,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as any;
      throw new Error(errData.message || `Analysis request failed with HTTP ${res.status}`);
    }

    const data = (await res.json()) as AnalysisApiResponse;
    if (!data.report) {
      throw new Error(data.message || "Analysis completed but no assessment report was returned.");
    }
    return data.report;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Repository analysis request timed out. Please check repository size or try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

