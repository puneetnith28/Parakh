import { useState } from "react";
import { MessageSquareText, Copy, Check, CheckCircle2 } from "lucide-react";
import { RequirementAssessment } from "@parakh/contracts";
import { Button } from "../ui/Button";
import {
  generateClarificationQuestions,
  formatQuestionsMarkdown,
} from "@parakh/assessment";

interface ClientQuestionsProps {
  assessments: RequirementAssessment[];
  className?: string;
}

export function ClientQuestions({ assessments, className = "" }: ClientQuestionsProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const questions = generateClarificationQuestions(assessments);

  const handleCopyAll = async () => {
    try {
      const markdown = formatQuestionsMarkdown(questions);
      await navigator.clipboard.writeText(markdown);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopySingle = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  if (questions.length === 0) {
    return (
      <div className={`p-8 rounded-3xl bg-white border border-[#E2E5DE] text-center space-y-3 font-sans shadow-xs ${className}`}>
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
        <h4 className="text-base font-bold text-[#111111]">No Clarifications Required</h4>
        <p className="text-xs text-[#5F625E] max-w-md mx-auto">
          All client requirements in the brief are fully specified with verified implementation proof.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-[#E2E5DE] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 font-sans ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E5DE]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-[#163300]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#5F625E]">Client Discovery</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
            Clarification & Discovery Inquiries
          </h3>
          <p className="text-xs sm:text-sm text-[#5F625E]">
            Suggested technical questions for client alignment meetings based on ambiguous requirements.
          </p>
        </div>

        <Button
          onClick={handleCopyAll}
          variant="outline"
          size="sm"
          icon={copiedAll ? <Check className="w-4 h-4 text-[#163300]" /> : <Copy className="w-4 h-4" />}
          className="font-bold text-xs bg-white shadow-xs self-start sm:self-center"
        >
          {copiedAll ? "Copied All Inquiries" : "Copy All Questions"}
        </Button>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.map((q) => (
          <div
            key={q.id}
            className="p-4 rounded-2xl bg-[#F8F9F7] border border-[#E2E5DE] flex items-start justify-between gap-4 hover:border-[#163300] transition"
          >
            <div className="space-y-1.5 flex-1">
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-[#E2E5DE] text-[#163300]">
                {q.requirementId}
              </span>
              <p className="text-xs sm:text-sm text-[#111111] font-medium leading-relaxed">
                {q.questionText}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleCopySingle(q.id, q.questionText)}
              className="p-2 rounded-xl text-[#5F625E] hover:text-[#111111] hover:bg-white transition border border-transparent hover:border-[#E2E5DE] shrink-0 cursor-pointer"
              title="Copy inquiry"
              aria-label="Copy inquiry"
            >
              {copiedId === q.id ? (
                <Check className="w-4 h-4 text-[#163300]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ClientQuestions;
