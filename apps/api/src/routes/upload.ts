import { Router, Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import multer from "multer";
import { pdfUpload, validatePdfMagicBytes } from "../middleware/fileUpload.js";

export const uploadRouter = Router();

uploadRouter.post(
  "/api/opportunity/upload",
  (req: Request, res: Response, next: NextFunction) => {
    pdfUpload.single("file")(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            status: "error",
            message: "File exceeds the maximum allowed size limit of 8 MB.",
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
  (req: Request, res: Response) => {
    const file = req.file!;
    const uploadId = `upload_${crypto.randomUUID()}`;

    res.status(200).json({
      status: "success",
      upload: {
        id: uploadId,
        filename: file.originalname,
        sizeBytes: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date().toISOString(),
      },
    });
  }
);
