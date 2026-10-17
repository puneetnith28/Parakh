import rateLimit from "express-rate-limit";
import { type Request, type Response } from "express";
import { config } from "../config.js";

/**
 * Express Rate Limiting Middleware.
 * Enforces request throttling on analysis and ingestion endpoints to protect
 * against API abuse and GitHub token quota exhaustion (max 10 runs per IP per hour).
 */
export const analysisRateLimiter = rateLimit({
  windowMs: config.ANALYSIS_RATE_LIMIT_WINDOW_MS || 3600000, // 1 hour
  max: config.ANALYSIS_RATE_LIMIT_MAX || 10,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req: Request) => {
    // Allow skipping in testing environments unless explicitly testing rate limits
    return process.env.NODE_ENV === "test" && req.headers["x-test-rate-limit"] !== "true";
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      status: "error",
      code: "RATE_LIMIT_EXCEEDED",
      message: `Rate limit exceeded. Maximum ${config.ANALYSIS_RATE_LIMIT_MAX} analysis runs per IP per hour allowed to prevent abuse.`,
    });
  },
});
