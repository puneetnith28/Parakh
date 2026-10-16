import { Router, Request, Response } from "express";
import crypto from "node:crypto";
import { TextSanitizer } from "../services/textSanitizer.js";

export const opportunityRouter = Router();

opportunityRouter.post("/api/opportunity/text", (req: Request, res: Response) => {
  try {
    const { text, title } = req.body || {};
    const sanitized = TextSanitizer.sanitize(text);

    const opportunityId = `opp_${crypto.randomUUID()}`;

    res.status(200).json({
      status: "success",
      opportunity: {
        id: opportunityId,
        title:
          typeof title === "string" && title.trim() ? title.trim() : "Untitled Opportunity Brief",
        rawText: sanitized.sanitizedText,
        characterCount: sanitized.characterCount,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(400).json({
      status: "error",
      message: error.message || "Failed to process opportunity text",
    });
  }
});
