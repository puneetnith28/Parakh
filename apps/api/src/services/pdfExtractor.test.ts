import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { PdfExtractor } from "./pdfExtractor.js";

test("PdfExtractor successfully extracts text from valid PDF document", async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([600, 400]);
  page.drawText("Parakh Technical RFP Requirements:\n- Build scalable React frontend\n- Deploy on Render", {
    x: 50,
    y: 350,
    font,
    size: 14,
  });

  const pdfBytes = await doc.save();
  const result = await PdfExtractor.extract(Buffer.from(pdfBytes));

  assert.equal(result.numpages, 1);
  assert.match(result.text, /Parakh Technical RFP Requirements/);
  assert.match(result.text, /Build scalable React frontend/);
  assert.ok(result.characterCount > 0);
});

test("PdfExtractor rejects empty buffer", async () => {
  await assert.rejects(async () => {
    await PdfExtractor.extract(Buffer.alloc(0));
  }, /empty PDF buffer/);
});
