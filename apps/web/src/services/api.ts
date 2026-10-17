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
