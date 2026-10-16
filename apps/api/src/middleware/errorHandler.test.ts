import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import {
  GitHubNotFoundError,
  GitHubForbiddenError,
  GitHubRateLimitError,
  GitHubApiError,
} from "@parakh/evidence";
import { errorHandler } from "./errorHandler.js";

describe("API Centralized Error Handler Middleware", () => {
  function createMockResponse() {
    let statusCode = 200;
    let jsonBody: unknown = null;

    const res: Partial<Response> = {
      status(code: number) {
        statusCode = code;
        return this as Response;
      },
      json(body: unknown) {
        jsonBody = body;
        return this as Response;
      },
    };

    return {
      res: res as Response,
      getStatus: () => statusCode,
      getBody: () => jsonBody as { error: string; code: string; resetTimestampMs?: number },
    };
  }

  const req = {} as Request;
  const next = () => {};

  test("translates GitHubNotFoundError to HTTP 404 with GITHUB_NOT_FOUND code", () => {
    const { res, getStatus, getBody } = createMockResponse();
    const err = new GitHubNotFoundError("facebook", "react");

    errorHandler(err, req, res, next);
    assert.equal(getStatus(), 404);
    assert.equal(getBody().code, "GITHUB_NOT_FOUND");
    assert.match(getBody().error, /was not found/i);
  });

  test("translates GitHubForbiddenError to HTTP 403 with GITHUB_FORBIDDEN code", () => {
    const { res, getStatus, getBody } = createMockResponse();
    const err = new GitHubForbiddenError("Repository is private");

    errorHandler(err, req, res, next);
    assert.equal(getStatus(), 403);
    assert.equal(getBody().code, "GITHUB_FORBIDDEN");
  });

  test("translates GitHubRateLimitError to HTTP 429 with GITHUB_RATE_LIMITED code", () => {
    const { res, getStatus, getBody } = createMockResponse();
    const resetTime = Date.now() + 60000;
    const err = new GitHubRateLimitError(resetTime, 0);

    errorHandler(err, req, res, next);
    assert.equal(getStatus(), 429);
    assert.equal(getBody().code, "GITHUB_RATE_LIMITED");
    assert.equal(getBody().resetTimestampMs, resetTime);
  });

  test("translates generic GitHubApiError to appropriate status code", () => {
    const { res, getStatus, getBody } = createMockResponse();
    const err = new GitHubApiError("Bad Gateway from GitHub", 502);

    errorHandler(err, req, res, next);
    assert.equal(getStatus(), 502);
    assert.equal(getBody().code, "GITHUB_API_ERROR");
  });

  test("falls back to HTTP 500 for generic internal exceptions", () => {
    const { res, getStatus, getBody } = createMockResponse();
    const err = new Error("Database crashed unexpectedly");

    errorHandler(err, req, res, next);
    assert.equal(getStatus(), 500);
    assert.equal(getBody().code, "INTERNAL_ERROR");
    assert.equal(getBody().error, "Database crashed unexpectedly");
  });
});
