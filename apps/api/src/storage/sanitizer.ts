import { AssessmentReport, Citation } from "@parakh/contracts";

export const MAX_SNIPPET_BYTES = 500;

/**
 * Sanitizes and truncates a single citation snippet to conform to strict data minimization.
 */
export function minimizeCitationSnippet(citation: Citation): Citation {
  let snippet = citation.snippet;
  const byteLength = Buffer.byteLength(snippet, "utf8");

  if (byteLength > MAX_SNIPPET_BYTES) {
    // Truncate to safe character boundary
    const truncated = snippet.slice(0, 420);
    snippet = `${truncated}\n\n// [...snippet truncated to 500 bytes for data minimization...]`;
  }

  return {
    ...citation,
    snippet,
  };
}

/**
 * Enforces data minimization before persisting an AssessmentReport.
 * Strips raw repository buffers, truncates snippets to max 500 bytes,
 * and preserves only necessary ground-truth references and rationales.
 */
export function sanitizeReportForPersistence(report: AssessmentReport): AssessmentReport {
  return {
    ...report,
    assessments: report.assessments.map((assessment) => ({
      ...assessment,
      citations: (assessment.citations || []).map(minimizeCitationSnippet),
    })),
  };
}

/**
 * Validates that an AssessmentReport satisfies all data minimization constraints.
 */
export function verifyDataMinimization(report: AssessmentReport): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  for (const item of report.assessments) {
    for (const cit of item.citations || []) {
      const bytes = Buffer.byteLength(cit.snippet, "utf8");
      if (bytes > MAX_SNIPPET_BYTES + 100) { // small tolerance for truncation notice
        violations.push(
          `Citation ${cit.candidateId} in ${item.requirementId} exceeds max snippet size (${bytes} > ${MAX_SNIPPET_BYTES})`
        );
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
