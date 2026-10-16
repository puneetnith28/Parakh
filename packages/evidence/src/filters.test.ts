import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { categorizeFile, filterAllowlist } from "./filters.js";

describe("File Path Allowlist and Category Filter", () => {
  test("categorizes source code files with language identification", () => {
    const ts = categorizeFile("src/services/auth.ts");
    assert.equal(ts.allowed, true);
    assert.equal(ts.fileType, "source");
    assert.equal(ts.language, "TypeScript");

    const py = categorizeFile("backend/app/main.py");
    assert.equal(py.allowed, true);
    assert.equal(py.fileType, "source");
    assert.equal(py.language, "Python");

    const go = categorizeFile("cmd/server/main.go");
    assert.equal(go.allowed, true);
    assert.equal(go.fileType, "source");
    assert.equal(go.language, "Go");
  });

  test("categorizes test files across various conventions", () => {
    const unitTest = categorizeFile("packages/evidence/src/urlValidator.test.ts");
    assert.equal(unitTest.allowed, true);
    assert.equal(unitTest.fileType, "test");

    const specFile = categorizeFile("spec/models/user_spec.rb");
    assert.equal(specFile.allowed, true);
    assert.equal(specFile.fileType, "test");

    const pyTest = categorizeFile("tests/test_authentication.py");
    assert.equal(pyTest.allowed, true);
    assert.equal(pyTest.fileType, "test");
  });

  test("categorizes documentation files", () => {
    const readme = categorizeFile("README.md");
    assert.equal(readme.allowed, true);
    assert.equal(readme.fileType, "doc");

    const docPage = categorizeFile("docs/architecture/adr-001.md");
    assert.equal(docPage.allowed, true);
    assert.equal(docPage.fileType, "doc");
  });

  test("categorizes manifest and configuration files", () => {
    const pkg = categorizeFile("package.json");
    assert.equal(pkg.allowed, true);
    assert.equal(pkg.fileType, "config");

    const docker = categorizeFile("deploy/Dockerfile");
    assert.equal(docker.allowed, true);
    assert.equal(docker.fileType, "config");
  });

  test("filterAllowlist filters mixed file collections", () => {
    const files = [
      "src/index.ts",
      "README.md",
      "package.json",
      "src/index.test.ts",
      "image.png",
      "video.mp4",
    ];

    const allowed = filterAllowlist(files);
    assert.equal(allowed.length, 4);
    assert.deepEqual(
      allowed.map((f) => f.path),
      ["src/index.ts", "README.md", "package.json", "src/index.test.ts"]
    );
  });

  test("strictly denylists vendor and build directories", () => {
    const blockedPaths = [
      "node_modules/express/index.js",
      "apps/api/node_modules/zod/index.js",
      "vendor/bundle/ruby.rb",
      ".git/config",
      "dist/bundle.js",
      "build/index.html",
      ".next/server/pages/index.js",
      "coverage/lcov-report/index.html",
    ];

    for (const path of blockedPaths) {
      const res = categorizeFile(path);
      assert.equal(res.allowed, false, `Expected ${path} to be denied`);
      assert.match(res.reason || "", /excluded directory pattern/i);
    }
  });

  test("strictly denylists lockfiles, secrets, and environment files", () => {
    const blocked = [
      ".env",
      ".env.production",
      ".env.local",
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "credentials.json",
      "id_rsa",
      "cert.pem",
      "ssl.key",
    ];

    for (const path of blocked) {
      const res = categorizeFile(path);
      assert.equal(res.allowed, false, `Expected ${path} to be denied`);
    }
  });

  test("strictly denylists binary, media, and minified files", () => {
    const blocked = [
      "assets/logo.png",
      "public/avatar.webp",
      "music/intro.mp3",
      "release/app.zip",
      "native/core.so",
      "static/jquery.min.js",
      "bundle.js.map",
    ];

    for (const path of blocked) {
      const res = categorizeFile(path);
      assert.equal(res.allowed, false, `Expected ${path} to be denied`);
    }
  });
});

