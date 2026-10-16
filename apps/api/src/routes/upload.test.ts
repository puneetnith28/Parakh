process.env.NODE_ENV = "test";
import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";

test("Upload validation checks PDF magic bytes and extracts opportunity", async () => {
  const { default: app } = await import("../server.js");
  const server = app.listen(3096);

  try {
    // 1. Create a real valid PDF document using pdf-lib
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([600, 400]);
    page.drawText("Client Technical Scope: Build Node and React Application", {
      x: 50,
      y: 350,
      font,
      size: 14,
    });
    const validPdfBytes = await doc.save();

    const formData1 = new FormData();
    formData1.append("file", new Blob([validPdfBytes], { type: "application/pdf" }), "document.pdf");

    const res1 = await fetch("http://localhost:3096/api/opportunity/upload", {
      method: "POST",
      body: formData1,
    });
    const json1 = (await res1.json()) as any;
    assert.equal(res1.status, 200);
    assert.equal(json1.status, "success");
    assert.equal(json1.upload.filename, "document.pdf");
    assert.equal(json1.opportunity.pageCount, 1);
    assert.match(json1.opportunity.rawText, /Build Node and React Application/);

    // 2. Fake PDF (binary without %PDF- magic bytes)
    const fakeBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00 disguised windows executable");
    const formData2 = new FormData();
    formData2.append("file", new Blob([fakeBuffer], { type: "application/pdf" }), "malware.pdf");

    const res2 = await fetch("http://localhost:3096/api/opportunity/upload", {
      method: "POST",
      body: formData2,
    });
    const json2 = (await res2.json()) as any;
    assert.equal(res2.status, 400);
    assert.match(json2.message, /magic bytes/);

    // 3. Non-PDF extension (e.g. .txt)
    const textBuffer = Buffer.from("just plain text");
    const formData3 = new FormData();
    formData3.append("file", new Blob([textBuffer], { type: "text/plain" }), "test.txt");

    const res3 = await fetch("http://localhost:3096/api/opportunity/upload", {
      method: "POST",
      body: formData3,
    });
    const json3 = (await res3.json()) as any;
    assert.equal(res3.status, 400);
    assert.match(json3.message, /Only \.pdf files are supported/);
  } finally {
    server.close();
  }
});
