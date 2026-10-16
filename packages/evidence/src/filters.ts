import type { FileType } from "@parakh/contracts";

/**
 * File Path Categorizer, Allowlist, and Defensive Denylist Filter.
 *
 * Categorizes repository files into source, test, doc, and config categories
 * for heuristic evidence weighting, while aggressively excluding vendor code,
 * binary assets, lockfiles, build outputs, and credential files.
 */

export interface CategorizedFile {
  path: string;
  allowed: boolean;
  fileType?: FileType;
  language?: string;
  reason?: string;
}

export interface DenylistCheckResult {
  denied: boolean;
  reason?: string;
}

const DENIED_DIR_PATTERNS = [
  /(?:^|\/)\.git\//i,
  /(?:^|\/)\.svn\//i,
  /(?:^|\/)\.hg\//i,
  /(?:^|\/)\.vscode\//i,
  /(?:^|\/)\.idea\//i,
  /(?:^|\/)node_modules\//i,
  /(?:^|\/)vendor\//i,
  /(?:^|\/)third_party\//i,
  /(?:^|\/)bower_components\//i,
  /(?:^|\/)site-packages\//i,
  /(?:^|\/)target\/(?:debug|release|\.rustc_info\.json)/i,
  /(?:^|\/)dist\//i,
  /(?:^|\/)build\//i,
  /(?:^|\/)out\//i,
  /(?:^|\/)bin\//i,
  /(?:^|\/)obj\//i,
  /(?:^|\/)\.next\//i,
  /(?:^|\/)\.nuxt\//i,
  /(?:^|\/)\.turbo\//i,
  /(?:^|\/)\.cache\//i,
  /(?:^|\/)coverage\//i,
  /(?:^|\/)\.nyc_output\//i,
];

const DENIED_EXTENSIONS = new Set([
  // Binaries, Executables & Objects
  ".exe", ".dll", ".so", ".dylib", ".class", ".pyc", ".pyo", ".wasm", ".o", ".a", ".bin",
  // Media & Images
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".avif", ".bmp", ".tiff",
  // Audio & Video
  ".mp4", ".webm", ".mkv", ".avi", ".mov", ".mp3", ".wav", ".ogg",
  // Archives
  ".zip", ".tar", ".gz", ".tgz", ".7z", ".rar", ".bz2",
  // Fonts
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  // Binary Documents
  ".pdf", ".docx", ".xlsx", ".pptx",
  // Secrets and Key Material
  ".pem", ".key", ".pfx", ".p12", ".crt", ".cert",
  // Source Maps & Minified
  ".map",
]);

const DENIED_FILENAMES = new Set([
  ".ds_store",
  "thumbs.db",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "cargo.lock",
  "composer.lock",
  "poetry.lock",
  "gemfile.lock",
  "credentials.json",
  "id_rsa",
  "id_ed25519",
]);

/**
 * Check if a file path is blocked by the security or hygiene denylist.
 */
export function isDeniedFile(filePath: string): DenylistCheckResult {
  const normalized = filePath.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();
  const filename = lower.split("/").pop() || "";
  const ext = filename.includes(".") ? `.${filename.split(".").pop()}` : "";

  // 1. Directory pattern denylist (vendor, build, git, etc.)
  for (const pattern of DENIED_DIR_PATTERNS) {
    if (pattern.test(lower)) {
      return { denied: true, reason: `Excluded directory pattern: ${pattern.source}` };
    }
  }

  // 2. Secret file patterns (e.g. .env, .env.local, .env.production)
  if (filename === ".env" || filename.startsWith(".env.")) {
    return { denied: true, reason: "Potential secret or environment file (.env*)" };
  }

  // 3. Exact filename denylist (lockfiles, secrets, OS metadata)
  if (DENIED_FILENAMES.has(filename)) {
    return { denied: true, reason: `Excluded lockfile, credential, or OS file: ${filename}` };
  }

  // 4. Minified file patterns
  if (filename.endsWith(".min.js") || filename.endsWith(".min.css") || filename.endsWith(".bundle.js")) {
    return { denied: true, reason: "Excluded minified or bundled artifact" };
  }

  // 5. Binary and media extension denylist
  if (DENIED_EXTENSIONS.has(ext)) {
    return { denied: true, reason: `Excluded binary or media extension: ${ext}` };
  }

  return { denied: false };
}

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".go": "Go",
  ".rs": "Rust",
  ".java": "Java",
  ".kt": "Kotlin",
  ".scala": "Scala",
  ".c": "C",
  ".cpp": "C++",
  ".cc": "C++",
  ".h": "C/C++ Header",
  ".hpp": "C++ Header",
  ".cs": "C#",
  ".rb": "Ruby",
  ".php": "PHP",
  ".swift": "Swift",
  ".sql": "SQL",
  ".sh": "Shell",
  ".bash": "Shell",
  ".zsh": "Shell",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".toml": "TOML",
  ".xml": "XML",
  ".md": "Markdown",
  ".rst": "reStructuredText",
  ".adoc": "AsciiDoc",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
};

const CONFIG_FILENAMES = new Set([
  "package.json",
  "tsconfig.json",
  "cargo.toml",
  "go.mod",
  "go.sum",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "requirements.txt",
  "pipfile",
  "pyproject.toml",
  "dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "makefile",
  "cmakelists.txt",
  ".eslintrc",
  ".eslintrc.js",
  ".eslintrc.json",
]);

/**
 * Categorize a file path into source, test, doc, or config.
 * Enforces the denylist check prior to categorization.
 */
export function categorizeFile(filePath: string): CategorizedFile {
  const denylistResult = isDeniedFile(filePath);
  if (denylistResult.denied) {
    return {
      path: filePath,
      allowed: false,
      reason: denylistResult.reason,
    };
  }

  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  const filename = normalized.split("/").pop() || "";
  const ext = filename.includes(".") ? `.${filename.split(".").pop()}` : "";

  // 1. Tests
  const isTestPath =
    normalized.includes("/test/") ||
    normalized.includes("/tests/") ||
    normalized.includes("/__tests__/") ||
    normalized.includes("/spec/") ||
    normalized.startsWith("test/") ||
    normalized.startsWith("tests/") ||
    normalized.startsWith("spec/");

  const isTestFilename =
    filename.includes(".test.") ||
    filename.includes(".spec.") ||
    filename.includes("_test.") ||
    filename.includes("_spec.") ||
    filename.startsWith("test_");

  if (isTestPath || isTestFilename) {
    return {
      path: filePath,
      allowed: true,
      fileType: "test",
      language: EXTENSION_LANGUAGE_MAP[ext],
    };
  }

  // 2. Config & Manifests
  if (CONFIG_FILENAMES.has(filename) || filename.startsWith("dockerfile")) {
    return {
      path: filePath,
      allowed: true,
      fileType: "config",
      language: EXTENSION_LANGUAGE_MAP[ext] || (filename.includes("docker") ? "Dockerfile" : "Config"),
    };
  }

  // 3. Documentation
  const isDocPath =
    normalized.includes("/docs/") ||
    normalized.includes("/doc/") ||
    normalized.startsWith("docs/") ||
    normalized.startsWith("doc/");

  const isDocFile =
    filename.startsWith("readme") ||
    filename.startsWith("contributing") ||
    filename.startsWith("changelog") ||
    filename.startsWith("architecture") ||
    ext === ".md" ||
    ext === ".rst" ||
    ext === ".adoc";

  if (isDocPath || isDocFile) {
    return {
      path: filePath,
      allowed: true,
      fileType: "doc",
      language: EXTENSION_LANGUAGE_MAP[ext] || "Markdown",
    };
  }

  // 4. Source code
  if (ext in EXTENSION_LANGUAGE_MAP) {
    return {
      path: filePath,
      allowed: true,
      fileType: "source",
      language: EXTENSION_LANGUAGE_MAP[ext],
    };
  }

  // Unrecognized file type
  return {
    path: filePath,
    allowed: false,
    reason: `File format '${ext || filename}' is not an analyzed code, test, doc, or config format`,
  };
}

/**
 * Filter an array of scanned file paths using both denylist and allowlist rules.
 */
export function filterAllowlist(filePaths: string[]): CategorizedFile[] {
  return filePaths.map(categorizeFile).filter((f) => f.allowed);
}
