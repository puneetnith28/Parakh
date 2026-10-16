import { RequirementAssessment } from "@parakh/contracts";

export interface ClarificationQuestion {
  id: string;
  requirementId: string;
  topic: string;
  questionText: string;
  context: string;
}

/**
 * Identifies ambiguous, conflicting, or unverified requirements in the assessment
 * and generates polite, professional clarification questions for prospective clients.
 */
export function generateClarificationQuestions(
  assessments: RequirementAssessment[]
): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [];

  for (const item of assessments) {
    if (item.status === "needs_review") {
      questions.push({
        id: `q_${item.requirementId}_ambiguity`,
        requirementId: item.requirementId,
        topic: "Architecture & Verification Scope",
        questionText: `Regarding "${item.requirementText}": Could you clarify your preferred technical approach or specific libraries you expect us to align with for this capability?`,
        context: item.rationale || "Citation validation flagged ambiguity in evidence requirements.",
      });
    } else if (item.status === "not_demonstrated") {
      questions.push({
        id: `q_${item.requirementId}_infrastructure`,
        requirementId: item.requirementId,
        topic: "Environment & Integrations",
        questionText: `Regarding "${item.requirementText}": Is there an existing environment, third-party vendor account, or internal API we should integrate against, or do you expect this to be built greenfield?`,
        context: "Requirement not found in supplied codebase evidence.",
      });
    } else if (item.status === "partially_demonstrated" && item.limitations) {
      questions.push({
        id: `q_${item.requirementId}_scope`,
        requirementId: item.requirementId,
        topic: "Scope & Edge Cases",
        questionText: `Regarding "${item.requirementText}": We have established core functionality. Are there specific scale, latency, or compliance constraints we should prioritize for this feature?`,
        context: item.limitations,
      });
    }
  }

  return questions;
}

/**
 * Formats client clarification questions into an email / message ready markdown template.
 */
export function formatQuestionsMarkdown(questions: ClarificationQuestion[]): string {
  if (questions.length === 0) {
    return "All requirements are clearly documented with complete technical evidence. No immediate clarification questions needed.";
  }

  const lines = [
    "Hi there,",
    "",
    "Thank you for sharing the project brief. To ensure our architecture and timeline precisely match your production needs, I have a few quick clarification questions:",
    "",
  ];

  questions.forEach((q, idx) => {
    lines.push(`${idx + 1}. **${q.topic}** (${q.requirementId})`);
    lines.push(`   ${q.questionText}`);
    lines.push("");
  });

  lines.push("Looking forward to your thoughts so we can finalize our implementation plan.");
  lines.push("Best regards,");

  return lines.join("\n");
}
