import type { Request, Response, NextFunction } from "express";
import {
  GitHubNotFoundError,
  GitHubForbiddenError,
  GitHubRateLimitError,
  GitHubTimeoutError,
  GitHubApiError,
} from "@parakh/evidence";

/**
 * Centralized API Error Handling Middleware.
 *
 * Translates domain, GitHub, validation, and system exceptions
 * into structured JSON diagnostic payloads.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // 1. GitHub 404
  if (err instanceof GitHubNotFoundError) {
    res.status(404).json({
      error: err.message,
      code: "GITHUB_NOT_FOUND",
    });
    return;
  }

  // 2. GitHub 403 Forbidden / Private
  if (err instanceof GitHubForbiddenError) {
    res.status(403).json({
      error: err.message,
      code: "GITHUB_FORBIDDEN",
    });
    return;
  }

  // 3. GitHub 429 Rate Limit
  if (err instanceof GitHubRateLimitError) {
    res.status(429).json({
      error: err.message,
      code: "GITHUB_RATE_LIMITED",
      resetTimestampMs: err.resetTimestampMs,
    });
    return;
  }

  // 4. GitHub 504 Timeout
  if (err instanceof GitHubTimeoutError) {
    res.status(504).json({
      error: err.message,
      code: "GITHUB_TIMEOUT",
    });
    return;
  }

  // 4. Other GitHub API errors
  if (err instanceof GitHubApiError) {
    res.status(err.statusCode || 502).json({
      error: err.message,
      code: "GITHUB_API_ERROR",
    });
    return;
  }

  // 5. Generic Error fallback
  const message = err instanceof Error ? err.message : "Internal server error occurred";
  const statusCode = (err as { status?: number; statusCode?: number }).statusCode || 500;

  res.status(statusCode).json({
    error: message,
    code: "INTERNAL_ERROR",
  });
}
