/**
 * Web Frontend Observability & Error Reporting.
 * Captures unhandled errors and promise rejections while scrubbing sensitive query tokens.
 */

export interface FrontendObservabilityConfig {
  dsn?: string;
  environment?: string;
}

export function scrubFrontendUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.searchParams.has("token")) {
      parsed.searchParams.set("token", "[REDACTED_VIEW_TOKEN]");
    }
    return parsed.toString();
  } catch {
    return url.replace(/token=[^&]+/g, "token=[REDACTED]");
  }
}

export function initFrontendObservability(_config: FrontendObservabilityConfig = {}): void {
  // Capture unhandled errors on the browser window
  window.addEventListener("error", (event) => {
    const sanitizedUrl = scrubFrontendUrl(event.filename || window.location.href);
    console.warn("[Parakh Frontend Telemetry] Unhandled UI error:", {
      message: event.message,
      source: sanitizedUrl,
      line: event.lineno,
      col: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.warn("[Parakh Frontend Telemetry] Unhandled promise rejection:", event.reason);
  });
}
