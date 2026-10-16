import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { getStorage } from "../storage/index.js";

/**
 * Generates a cryptographically secure 256-bit access token.
 */
export function generateViewToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Constant-time string comparison to defend against timing side-channel attacks.
 */
export function safeCompareTokens(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export interface AuthenticatedReportRequest extends Request {
  reportRecord?: {
    report: any;
    viewToken: string;
  };
}

/**
 * Middleware requiring a valid cryptographic viewToken to access report records.
 * Accepts token via 'X-Report-Token', 'Authorization: Bearer <token>', or '?token=' query parameter.
 */
export async function requireReportToken(
  req: AuthenticatedReportRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const reportId = req.params.id;

  if (!reportId) {
    res.status(400).json({ status: "error", message: "Report ID parameter is required." });
    return;
  }

  // Extract token
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (req.headers["x-report-token"]) {
    token = String(req.headers["x-report-token"]).trim();
  } else if (req.query.token) {
    token = String(req.query.token).trim();
  }

  if (!token) {
    res.status(401).json({
      status: "error",
      message: "Authorization token required to access this report record.",
      code: "TOKEN_REQUIRED",
    });
    return;
  }

  const storage = getStorage();
  const record = await storage.getReportById(reportId);

  if (!record) {
    res.status(404).json({
      status: "error",
      message: "Report not found or has expired.",
      code: "REPORT_NOT_FOUND",
    });
    return;
  }

  if (!safeCompareTokens(token, record.viewToken)) {
    res.status(403).json({
      status: "error",
      message: "Invalid access token for this report.",
      code: "FORBIDDEN",
    });
    return;
  }

  req.reportRecord = record;
  next();
}
