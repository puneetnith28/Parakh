import { useState } from "react";
import { MessageSquareText, Copy, Check, Sparkles, CheckCircle2 } from "lucide-react";
import { RequirementAssessment } from "@parakh/contracts";
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
      <div className={`p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-2 ${className}`}>
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
        <h4 className="text-sm font-semibold text-emerald-200">No Clarifications Required</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          All client requirements in the brief are fully specified with verified implementation proof.
        </p>
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <MessageSquareText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Client Clarification Questions</h3>
            <p className="text-xs text-slate-400">
              Polite, targeted questions to de-risk ambiguous or unverified requirements
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition text-xs font-medium shadow-sm"
        >
          {copiedAll ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">Copied Full Message</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy All to Clipboard</span>
            </>
          )}
        </button>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 transition space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-indigo-400 font-mono">
                  Q{idx + 1}.
                </span>
                <span className="text-xs font-semibold text-slate-200">{q.topic}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                  {q.requirementId}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleCopySingle(q.id, q.questionText)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition text-xs flex items-center gap-1"
                title="Copy question text"
              >
                {copiedId === q.id ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40">
              "{q.questionText}"
            </p>

            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Sparkles className="w-3 h-3 text-slate-500" />
              <span>Trigger: {q.context}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
