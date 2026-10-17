import * as Sentry from "@sentry/node";
import { scrubObject, scrubSecrets } from "../utils/scrubber.js";
import { config } from "../config.js";

export interface SentryStatus {
  initialized: boolean;
  environment: string;
  dsnConfigured: boolean;
}

/**
 * Custom beforeSend hook for Sentry to scrub sensitive credentials,
 * API tokens, database URIs, and repository authorization headers.
 */
export function sentryBeforeSend(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  if (!event) return null;

  // Scrub exception values
  if (event.exception?.values) {
    for (const val of event.exception.values) {
      if (val.value) {
        val.value = scrubSecrets(val.value);
      }
    }
  }

  // Scrub breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => {
      if (crumb.message) crumb.message = scrubSecrets(crumb.message);
      if (crumb.data) crumb.data = scrubObject(crumb.data);
      return crumb;
    });
  }

  // Scrub extra context & tags
  if (event.extra) {
    event.extra = scrubObject(event.extra);
  }

  // Scrub request headers / query params
  if (event.request) {
    if (event.request.headers) {
      event.request.headers = scrubObject(event.request.headers);
    }
    if (event.request.query_string) {
      event.request.query_string = scrubSecrets(String(event.request.query_string));
    }
    if (event.request.data) {
      event.request.data = scrubObject(event.request.data);
    }
  }

  return event;
}

let isInitialized = false;

/**
 * Initializes Sentry Agent Tracing and Error Monitoring.
 */
export function initSentry(): SentryStatus {
  const dsn = config.SENTRY_DSN || process.env.SENTRY_DSN;

  if (dsn && dsn.trim().startsWith("http") && !isInitialized) {
    try {
      Sentry.init({
        dsn,
        environment: config.SENTRY_ENVIRONMENT || "development",
        tracesSampleRate: 1.0,
        beforeSend: sentryBeforeSend as any,
      });
      isInitialized = true;
      console.log("[Parakh Observability] Sentry agent tracing initialized.");
    } catch (err: any) {
      console.warn("[Parakh Observability] Sentry initialization warning:", err.message);
    }
  }

  return {
    initialized: isInitialized,
    environment: config.SENTRY_ENVIRONMENT || "development",
    dsnConfigured: Boolean(dsn && dsn.trim().length > 0),
  };
}

/**
 * Wraps async workflow steps with Sentry span tracking for latency & error attribution.
 */
export async function trackStep<T>(
  stepName: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await fn();
    return result;
  } catch (error) {
    captureExceptionScrubbed(error, { stepName, operation, latencyMs: Date.now() - startTime });
    throw error;
  }
}

/**
 * Captures an error with automatic credential scrubbing.
 */
export function captureExceptionScrubbed(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const scrubbedContext = context ? scrubObject(context) : undefined;
  if (isInitialized) {
    Sentry.withScope((scope) => {
      if (scrubbedContext) {
        scope.setExtras(scrubbedContext);
      }
      Sentry.captureException(error);
    });
  } else {
    // Local dev fallback logging
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[Parakh Observability Error] (${scrubSecrets(msg)})`, scrubbedContext);
  }
}
