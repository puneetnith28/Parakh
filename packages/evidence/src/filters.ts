import type { FileType } from "@parakh/contracts";

/**
 * File Path Categorizer and Evidence Allowlist Filter.
 *
 * Categorizes repository files into source, test, doc, and config categories
 * for heuristic evidence weighting, while identifying file programming language.
 */

export interface CategorizedFile {
  path: string;
  allowed: boolean;
  fileType?: FileType;
  language?: string;
  reason?: string;
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
 */
export function categorizeFile(filePath: string): CategorizedFile {
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
 * Filter an array of scanned file paths using the allowlist.
 */
export function filterAllowlist(filePaths: string[]): CategorizedFile[] {
  return filePaths.map(categorizeFile).filter((f) => f.allowed);
}
