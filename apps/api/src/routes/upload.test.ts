process.env.NODE_ENV = "test";
import test from "node:test";
import assert from "node:assert/strict";

test("Upload validation checks PDF magic bytes", async () => {
  const { default: app } = await import("../server.js");
  const server = app.listen(3097);

  try {
    // 1. Valid PDF buffer with %PDF- header
    const validPdfBuffer = Buffer.from("%PDF-1.4 sample pdf content for unit testing");
    const formData1 = new FormData();
    formData1.append(
      "file",
      new Blob([validPdfBuffer], { type: "application/pdf" }),
      "document.pdf"
    );

    const res1 = await fetch("http://localhost:3097/api/opportunity/upload", {
      method: "POST",
      body: formData1,
    });
    const json1 = await res1.json();
    assert.equal(res1.status, 200);
    assert.equal(json1.status, "success");
    assert.equal(json1.upload.filename, "document.pdf");

    // 2. Fake PDF (executable/binary disguised as PDF without %PDF- magic bytes)
    const fakeBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00 disguised windows executable");
    const formData2 = new FormData();
    formData2.append("file", new Blob([fakeBuffer], { type: "application/pdf" }), "malware.pdf");

    const res2 = await fetch("http://localhost:3097/api/opportunity/upload", {
      method: "POST",
      body: formData2,
    });
    const json2 = await res2.json();
    assert.equal(res2.status, 400);
    assert.match(json2.message, /magic bytes/);

    // 3. Non-PDF extension (e.g. .txt)
    const textBuffer = Buffer.from("just plain text");
    const formData3 = new FormData();
    formData3.append("file", new Blob([textBuffer], { type: "text/plain" }), "test.txt");

    const res3 = await fetch("http://localhost:3097/api/opportunity/upload", {
      method: "POST",
      body: formData3,
    });
    const json3 = await res3.json();
    assert.equal(res3.status, 400);
    assert.match(json3.message, /Only \.pdf files are supported/);
  } finally {
    server.close();
  }
});
