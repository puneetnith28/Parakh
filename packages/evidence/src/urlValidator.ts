/**
 * Strict GitHub URL Validator and SSRF Guard.
 *
 * Enforces canonical repository URL format: https://github.com/{owner}/{repo}
 * Rejects SSRF vectors including:
 *  - IP address hostnames (loopback, private, link-local, cloud metadata: 169.254.169.254)
 *  - Localhost and non-github domains
 *  - Embedded userinfo (e.g. user:pass@)
 *  - Custom ports (e.g. github.com:8080)
 *  - Path traversal and arbitrary path injection
 */

export interface GitHubRepoIdentifier {
  valid: true;
  owner: string;
  repo: string;
  canonicalUrl: string;
}

export interface InvalidGitHubRepo {
  valid: false;
  error: string;
}

export type GitHubUrlValidationResult = GitHubRepoIdentifier | InvalidGitHubRepo;

// GitHub owner: 1-39 chars, alphanumeric or single hyphens, cannot start or end with a hyphen
const GITHUB_OWNER_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

// GitHub repo: 1-100 chars, alphanumeric, hyphens, underscores, dots (no path separators)
const GITHUB_REPO_REGEX = /^[a-zA-Z0-9_.-]{1,100}$/;

// Known blocked SSRF hosts / subnets
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./, // AWS / GCP / Azure Instance Metadata
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

export function validateGitHubUrl(rawInput: string): GitHubUrlValidationResult {
  if (!rawInput || typeof rawInput !== "string" || !rawInput.trim()) {
    return { valid: false, error: "Repository URL cannot be empty" };
  }

  const trimmed = rawInput.trim();

  // Guard against encoded or literal traversal or control chars
  if (/[\x00-\x1F\x7F]/.test(trimmed) || /\.\./.test(trimmed) || /%2e%2e/i.test(trimmed)) {
    return { valid: false, error: "URL contains forbidden control characters or traversal sequences" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Malformed URL syntax" };
  }

  // Must be http or https protocol
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: `Invalid protocol '${parsed.protocol}': only HTTPS or HTTP supported` };
  }

  // Reject userinfo (e.g. https://token@github.com)
  if (parsed.username || parsed.password) {
    return { valid: false, error: "Embedded authentication credentials in URL are forbidden" };
  }

  // Reject custom ports
  if (parsed.port && parsed.port !== "80" && parsed.port !== "443") {
    return { valid: false, error: `Custom port '${parsed.port}' is forbidden` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // SSRF guard on hostname
  for (const pattern of BLOCKED_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, error: `SSRF guard: Access to restricted host '${hostname}' is denied` };
    }
  }

  // Enforce strictly github.com host
  if (hostname !== "github.com" && hostname !== "www.github.com") {
    return { valid: false, error: `Invalid host '${hostname}': only 'github.com' is supported` };
  }

  // Parse path segments: expected format /{owner}/{repo}
  // Strip trailing slashes and split
  const pathParts = parsed.pathname
    .split("/")
    .filter((part) => part.length > 0);

  if (pathParts.length < 2) {
    return {
      valid: false,
      error: "GitHub repository path must contain both owner and repository name (e.g., owner/repo)",
    };
  }

  const [rawOwner, rawRepo] = pathParts;

  // Clean trailing .git if present
  const cleanedRepo = rawRepo.endsWith(".git") ? rawRepo.slice(0, -4) : rawRepo;

  if (!GITHUB_OWNER_REGEX.test(rawOwner)) {
    return { valid: false, error: `Invalid GitHub owner identifier: '${rawOwner}'` };
  }

  if (!cleanedRepo || !GITHUB_REPO_REGEX.test(cleanedRepo) || cleanedRepo === "." || cleanedRepo === "..") {
    return { valid: false, error: `Invalid GitHub repository identifier: '${rawRepo}'` };
  }

  return {
    valid: true,
    owner: rawOwner,
    repo: cleanedRepo,
    canonicalUrl: `https://github.com/${rawOwner}/${cleanedRepo}`,
  };
}
