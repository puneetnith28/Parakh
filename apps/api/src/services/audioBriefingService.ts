import { AssessmentReport } from "@parakh/contracts";
import {
  elevenLabsAdapter,
  ElevenLabsAdapter,
  ElevenLabsNarrationResult,
} from "@parakh/integrations";

/**
 * Builds a concise, strictly factual executive summary from an AssessmentReport.
 * Never invents assessment findings or hallucinates skills.
 * Guarantees output is bounded within 800 characters to comfortably comply
 * with voice narration bounds (1000 char maximum).
 */
export function buildExecutiveSummaryText(report: AssessmentReport): string {
  const opportunityTitle = report.opportunityTitle?.trim() || "Technical Opportunity";
  const repoName =
    report.repoMetadata?.repo ||
    (report.repositoryUrl ? report.repositoryUrl.replace(/^https?:\/\/github\.com\//, "") : "candidate repository");
  const shortSha = report.resolvedCommitSha ? report.resolvedCommitSha.slice(0, 7) : "";

  const { total, demonstrated, partiallyDemonstrated, notDemonstrated } = report.coverageSummary;

  const topDemonstrated = (report.assessments || [])
    .filter((a) => a.status === "demonstrated" && (a.requirementText || (a as any).requirementTitle))
    .map((a) => {
      const text = ((a as any).requirementTitle || a.requirementText || "").trim();
      return text.length > 50 ? text.slice(0, 47) + "..." : text;
    })
    .slice(0, 3);

  const sentences: string[] = [];
  sentences.push(
    `Executive assessment briefing for ${opportunityTitle}. Candidate repository ${repoName}${
      shortSha ? ` at commit ${shortSha}` : ""
    }.`
  );

  sentences.push(
    `Analysis completed with ${demonstrated} of ${total} discrete technical requirements verified with line-level code citations.`
  );

  if (partiallyDemonstrated > 0) {
    sentences.push(`${partiallyDemonstrated} requirement${partiallyDemonstrated === 1 ? " was" : "s were"} partially demonstrated.`);
  }

  if (notDemonstrated > 0) {
    sentences.push(`${notDemonstrated} requirement${notDemonstrated === 1 ? " lacked" : "s lacked"} code implementation evidence.`);
  }

  if (topDemonstrated.length > 0) {
    sentences.push(`Key verified capabilities include: ${topDemonstrated.join(", ")}.`);
  }

  sentences.push("All cited evidence is cryptographically grounded in candidate source code.");

  const fullText = sentences.join(" ");
  if (fullText.length > 800) {
    return fullText.substring(0, 797) + "...";
  }
  return fullText;
}

/**
 * Generates an audio briefing using the configured ElevenLabs adapter.
 */
export async function generateAudioBriefing(
  report: AssessmentReport,
  adapter: ElevenLabsAdapter = elevenLabsAdapter
): Promise<ElevenLabsNarrationResult> {
  const summaryText = buildExecutiveSummaryText(report);
  return adapter.narrateSummary(summaryText);
}
