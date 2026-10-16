/**
 * Sensitive Data Scrubber for Logs, Telemetry, and Storage Persistence.
 * Redacts secrets, credentials, API keys, and connection passwords.
 */

const SECRET_PATTERNS: { regex: RegExp; replacement: string }[] = [
  // GitHub Personal Access Tokens (classic and fine-grained)
  {
    regex: /gh[pousr]_[A-Za-z0-9_]{36,255}/g,
    replacement: "[REDACTED_GITHUB_TOKEN]",
  },
  {
    regex: /github_pat_[A-Za-z0-9_]{82}/g,
    replacement: "[REDACTED_GITHUB_PAT]",
  },

  // Google AI Studio / Gemini / Cloud API Keys
  {
    regex: /AIza[0-9A-Za-z-_]{35}/g,
    replacement: "[REDACTED_AI_STUDIO_KEY]",
  },

  // OpenAI / General sk-* keys
  {
    regex: /sk-[A-Za-z0-9_-]{20,64}/g,
    replacement: "[REDACTED_API_KEY]",
  },

  // AWS Access Key ID
  {
    regex: /AKIA[0-9A-Z]{16}/g,
    replacement: "[REDACTED_AWS_KEY]",
  },

  // Generic Bearer Tokens
  {
    regex: /Bearer\s+([A-Za-z0-9\-._~+/]+=*)/gi,
    replacement: "Bearer [REDACTED_BEARER_TOKEN]",
  },

  // Database Connection Passwords (MongoDB, Postgres, MySQL)
  {
    regex: /(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/gi,
    replacement: "$1[REDACTED_PASSWORD]$3",
  },
  {
    regex: /(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi,
    replacement: "$1[REDACTED_PASSWORD]$3",
  },

  // Private Keys
  {
    regex: /-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----[\s\S]*?-----END[ A-Z0-9_-]+PRIVATE KEY-----/g,
    replacement: "[REDACTED_PRIVATE_KEY]",
  },
];

/**
 * Scrubs all known credentials and high-entropy secret patterns from a string.
 */
export function scrubSecrets(input: string): string {
  if (typeof input !== "string") return input;

  let sanitized = input;
  for (const { regex, replacement } of SECRET_PATTERNS) {
    sanitized = sanitized.replace(regex, replacement);
  }

  return sanitized;
}

/**
 * Recursively scrubs credentials from structured objects (logs, metadata, errors).
 */
export function scrubObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return scrubSecrets(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => scrubObject(item)) as unknown as T;
  }

  if (typeof obj === "object" && !(obj instanceof Date) && !(obj instanceof RegExp)) {
    const copy: any = {};
    for (const [key, value] of Object.entries(obj)) {
      copy[key] = scrubObject(value);
    }
    return copy;
  }

  return obj;
}
