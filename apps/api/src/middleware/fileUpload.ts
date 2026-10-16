import multer, { FileFilterCallback } from "multer";
import { Request, Response, NextFunction } from "express";
import path from "node:path";
import { config } from "../config.js";

const storage = multer.memoryStorage();

const MAX_BYTES = config.MAX_UPLOAD_MB * 1024 * 1024;

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== ".pdf") {
    return cb(new Error("Invalid file extension. Only .pdf files are supported."));
  }
  if (file.mimetype !== "application/pdf" && file.mimetype !== "application/x-pdf") {
    return cb(new Error("Invalid MIME type. Uploaded file must be a PDF document."));
  }
  cb(null, true);
};

export const pdfUpload = multer({
  storage,
  limits: {
    fileSize: MAX_BYTES,
    files: 1,
  },
  fileFilter,
});

export function validatePdfMagicBytes(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return res.status(400).json({
      status: "error",
      message: "No PDF file provided. Please attach a 'file' field in multipart form data.",
    });
  }

  const buffer = req.file.buffer;
  if (!buffer || buffer.length < 5) {
    return res.status(400).json({
      status: "error",
      message: "Uploaded file is corrupted or empty.",
    });
  }

  // Magic bytes check: PDF files start with %PDF-
  const header = buffer.subarray(0, 5).toString("ascii");
  if (header !== "%PDF-") {
    return res.status(400).json({
      status: "error",
      message:
        "File validation failed. Uploaded content does not match standard PDF magic bytes (%PDF-).",
    });
  }

  next();
}
