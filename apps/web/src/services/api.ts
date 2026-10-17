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
  signal?: AbortSignal;
}): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), params.timeoutMs ?? 180000);

  // Link caller signal if supplied
  if (params.signal) {
    if (params.signal.aborted) {
      controller.abort();
    } else {
      params.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

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

    const data = (await res.json()) as AnalysisApiResponse & { viewToken?: string };
    if (!data.report) {
      throw new Error(data.message || "Analysis completed but no assessment report was returned.");
    }
    return {
      report: data.report,
      viewToken: data.viewToken,
    };
  } catch (err: any) {
    if (params.signal?.aborted) {
      const abortErr = new Error("Analysis request cancelled by user.");
      abortErr.name = "AbortError";
      throw abortErr;
    }
    if (err.name === "AbortError") {
      throw new Error("Repository analysis request timed out. Please check repository size or try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch a persisted report by ID and secure 256-bit viewToken.
 */
export async function fetchReportById(
  id: string,
  token: string
): Promise<{ report: any; viewToken: string }> {
  const url = getApiUrl(`/api/reports/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`);
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Unauthorized: Invalid or expired report view token.");
    }
    if (res.status === 404) {
      throw new Error("Report not found or expired retention period.");
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch report: HTTP ${res.status}`);
  }

  const data = await res.json();
  return {
    report: data.report,
    viewToken: token,
  };
}

/**
 * Permanently delete a persisted report.
 */
export async function deleteReportById(id: string, token: string): Promise<boolean> {
  const url = getApiUrl(`/api/reports/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`);
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.status === 204 || res.ok;
}

export interface RepositoryInspectionResult {
  canonicalUrl: string;
  metadata: {
    owner: string;
    repo: string;
    fullName: string;
    description: string | null;
    defaultBranch: string;
    isPrivate: boolean;
    stars: number;
    forks: number;
    openIssues: number;
    language: string;
    languages: Record<string, number>;
    updatedAt: string;
  };
  pinnedRevision: {
    owner: string;
    repo: string;
    ref: string;
    commitSha: string;
    resolvedAt: string;
  };
}

/**
 * Inspect a GitHub repository URL: validates against SSRF and resolves pinned revision metadata.
 */
export async function inspectRepository(
  url: string,
  ref?: string
): Promise<RepositoryInspectionResult> {
  const res = await fetch(getApiUrl("/api/repository/inspect"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: url.trim(), ref: ref?.trim() }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Failed to inspect repository: HTTP ${res.status}`);
  }

  return (await res.json()) as RepositoryInspectionResult;
}

export interface HealthDiagnosticsResult {
  status: string;
  service: string;
  version: string;
  environment: string;
  truthfulReporting: boolean;
  modelProvider: string;
  isMockModel: boolean;
  mastra?: {
    initialized: boolean;
    provider: string;
  };
  storage?: {
    connected: boolean;
    isPersistent: boolean;
    storageMode: string;
    durableStorageAvailable: boolean;
  };
}

/**
 * Fetch full component health and diagnostics telemetry from backend.
 */
export async function fetchHealthDiagnostics(): Promise<HealthDiagnosticsResult> {
  const res = await fetch(getApiUrl("/api/health"), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Health diagnostics endpoint returned HTTP ${res.status}`);
  }

  return (await res.json()) as HealthDiagnosticsResult;
}

