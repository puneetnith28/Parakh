import { Router, Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import multer from "multer";
import { pdfUpload, validatePdfMagicBytes } from "../middleware/fileUpload.js";
import { PdfExtractor } from "../services/pdfExtractor.js";
import { ExtractionService } from "../services/extractionService.js";

export const opportunityRouter = Router();

/**
 * POST /api/opportunity/text
 * Extracts structured technical requirements from raw opportunity text or brief.
 */
opportunityRouter.post("/api/opportunity/text", async (req: Request, res: Response) => {
  try {
    const { text, title } = req.body || {};

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Opportunity brief text is required and cannot be empty",
      });
    }

    const result = await ExtractionService.extract(text, { title });

    res.status(200).json({
      status: "success",
      opportunity: result.opportunity,
      extraction: result.extraction,
      metadata: result.metadata,
    });
  } catch (error: any) {
    res.status(400).json({
      status: "error",
      message: error.message || "Failed to extract requirements from opportunity text",
    });
  }
});

/**
 * POST /api/opportunity/pdf
 * Uploads a PDF RFP or opportunity brief and extracts structured technical requirements.
 */
opportunityRouter.post(
  "/api/opportunity/pdf",
  (req: Request, res: Response, next: NextFunction) => {
    pdfUpload.single("file")(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            status: "error",
            message: "File exceeds the maximum allowed upload limit.",
          });
        }
        return res.status(400).json({
          status: "error",
          message: `Upload error: ${err.message}`,
        });
      } else if (err) {
        return res.status(400).json({
          status: "error",
          message: err.message || "File upload validation failed.",
        });
      }
      next();
    });
  },
  validatePdfMagicBytes,
  async (req: Request, res: Response) => {
    try {
      const file = req.file!;
      const uploadId = `upload_${crypto.randomUUID()}`;

      const extracted = await PdfExtractor.extract(file.buffer);
      const title = file.originalname.replace(/\.pdf$/i, "");

      const result = await ExtractionService.extract(extracted.text, {
        title,
        pageNumber: 1,
      });

      res.status(200).json({
        status: "success",
        upload: {
          id: uploadId,
          filename: file.originalname,
          sizeBytes: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date().toISOString(),
        },
        opportunity: {
          ...result.opportunity,
          pageCount: extracted.numpages,
        },
        extraction: result.extraction,
        metadata: result.metadata,
      });
    } catch (err: any) {
      res.status(400).json({
        status: "error",
        message: err.message || "Failed to extract requirements from PDF",
      });
    }
  }
);
