import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateGitHubUrl } from "./urlValidator.js";

describe("Strict GitHub URL Validator & SSRF Guard", () => {
  test("accepts canonical github repository URLs", () => {
    const res1 = validateGitHubUrl("https://github.com/facebook/react");
    assert.equal(res1.valid, true);
    if (res1.valid) {
      assert.equal(res1.owner, "facebook");
      assert.equal(res1.repo, "react");
      assert.equal(res1.canonicalUrl, "https://github.com/facebook/react");
    }

    const res2 = validateGitHubUrl("https://github.com/owner-name/repo.tool-kit.js");
    assert.equal(res2.valid, true);
    if (res2.valid) {
      assert.equal(res2.owner, "owner-name");
      assert.equal(res2.repo, "repo.tool-kit.js");
    }
  });

  test("strips trailing .git from repository name", () => {
    const res = validateGitHubUrl("https://github.com/puneetnith28/Parakh.git");
    assert.equal(res.valid, true);
    if (res.valid) {
      assert.equal(res.owner, "puneetnith28");
      assert.equal(res.repo, "Parakh");
      assert.equal(res.canonicalUrl, "https://github.com/puneetnith28/Parakh");
    }
  });

  test("blocks SSRF loopback and private IP addresses", () => {
    const blocked = [
      "http://127.0.0.1/owner/repo",
      "http://localhost/owner/repo",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.0.0.1/test/repo",
      "http://192.168.1.1/test/repo",
      "http://172.16.0.1/test/repo",
      "http://0.0.0.0/test/repo",
    ];

    for (const url of blocked) {
      const res = validateGitHubUrl(url);
      assert.equal(res.valid, false, `Should reject SSRF URL: ${url}`);
      if (!res.valid) {
        assert.ok(res.error.length > 0);
      }
    }
  });

  test("rejects arbitrary external domains", () => {
    const invalidDomains = [
      "https://gitlab.com/owner/repo",
      "https://bitbucket.org/owner/repo",
      "https://evil-github.com/owner/repo",
      "https://github.com.attacker.com/owner/repo",
    ];

    for (const url of invalidDomains) {
      const res = validateGitHubUrl(url);
      assert.equal(res.valid, false);
      if (!res.valid) {
        assert.match(res.error, /only 'github\.com' is supported/i);
      }
    }
  });

  test("rejects embedded user credentials and custom ports", () => {
    const credentialUrl = "https://token:secret@github.com/owner/repo";
    const resCred = validateGitHubUrl(credentialUrl);
    assert.equal(resCred.valid, false);
    if (!resCred.valid) {
      assert.match(resCred.error, /credentials/i);
    }

    const portUrl = "https://github.com:8443/owner/repo";
    const resPort = validateGitHubUrl(portUrl);
    assert.equal(resPort.valid, false);
    if (!resPort.valid) {
      assert.match(resPort.error, /port/i);
    }
  });

  test("rejects malformed or empty inputs", () => {
    assert.equal(validateGitHubUrl("").valid, false);
    assert.equal(validateGitHubUrl("   ").valid, false);
    assert.equal(validateGitHubUrl("not-a-url").valid, false);
    assert.equal(validateGitHubUrl("https://github.com").valid, false);
    assert.equal(validateGitHubUrl("https://github.com/onlyowner").valid, false);
  });
});
