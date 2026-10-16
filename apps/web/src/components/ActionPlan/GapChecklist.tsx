import { useState } from "react";
import { CheckSquare, Square, CheckCircle, ListTodo } from "lucide-react";
import { RequirementAssessment } from "@parakh/contracts";

export interface GapActionItem {
  id: string;
  requirementId: string;
  requirementText: string;
  actionText: string;
  category: "code_test" | "client_clarification" | "alternative_repo";
  completed: boolean;
}

interface GapChecklistProps {
  assessments: RequirementAssessment[];
  className?: string;
}

export function generateGapActions(assessments: RequirementAssessment[]): GapActionItem[] {
  const gapItems = assessments.filter(
    (a) => a.status === "partially_demonstrated" || a.status === "not_demonstrated" || a.status === "needs_review"
  );

  const actions: GapActionItem[] = [];

  gapItems.forEach((gap) => {
    // 1. If Gemma returned nextActions, include them
    if (gap.nextActions && gap.nextActions.length > 0) {
      gap.nextActions.forEach((act, actIdx) => {
        actions.push({
          id: `${gap.requirementId}_act_${actIdx}`,
          requirementId: gap.requirementId,
          requirementText: gap.requirementText,
          actionText: act,
          category: "code_test",
          completed: false,
        });
      });
    } else if (gap.status === "partially_demonstrated") {
      // Synthesize specific actionable step
      actions.push({
        id: `${gap.requirementId}_gen_test`,
        requirementId: gap.requirementId,
        requirementText: gap.requirementText,
        actionText: `Add automated behavioral tests to prove working functionality for: "${gap.requirementText}"`,
        category: "code_test",
        completed: false,
      });
    } else if (gap.status === "not_demonstrated") {
      actions.push({
        id: `${gap.requirementId}_gen_missing`,
        requirementId: gap.requirementId,
        requirementText: gap.requirementText,
        actionText: `Identify alternative GitHub repository or link prior project demonstrating: "${gap.requirementText}"`,
        category: "alternative_repo",
        completed: false,
      });
      actions.push({
        id: `${gap.requirementId}_gen_clarify`,
        requirementId: gap.requirementId,
        requirementText: gap.requirementText,
        actionText: `Inquire if client has an existing architecture or standard for: "${gap.requirementText}"`,
        category: "client_clarification",
        completed: false,
      });
    } else {
      // needs_review
      actions.push({
        id: `${gap.requirementId}_gen_review`,
        requirementId: gap.requirementId,
        requirementText: gap.requirementText,
        actionText: `Review codebase manually to resolve citation ambiguity for: "${gap.requirementText}"`,
        category: "code_test",
        completed: false,
      });
    }
  });

  return actions;
}

export function GapChecklist({ assessments, className = "" }: GapChecklistProps) {
  const [items, setItems] = useState<GapActionItem[]>(() => generateGapActions(assessments));

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, completed: !it.completed } : it))
    );
  };

  const completedCount = items.filter((it) => it.completed).length;
  const totalCount = items.length;

  if (totalCount === 0) {
    return (
      <div className={`p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-2 ${className}`}>
        <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
        <h4 className="text-sm font-semibold text-emerald-200">Zero Technical Gaps Detected</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          All extracted client requirements have verified source code or test proof in your repository snapshot.
        </p>
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ListTodo className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Gap Resolution Action Plan</h3>
            <p className="text-xs text-slate-400">
              Concrete steps to close unverified requirements prior to submitting proposal
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-medium text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
          {completedCount} of {totalCount} completed
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/60">
        <div
          style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          className="h-full bg-emerald-500 transition-all duration-300"
        />
      </div>

      {/* Action Items List */}
      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              item.completed
                ? "bg-slate-950/40 border-slate-800/50 opacity-60 line-through"
                : "bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
            }`}
          >
            <button
              type="button"
              className="mt-0.5 text-slate-400 hover:text-emerald-400 transition shrink-0"
            >
              {item.completed ? (
                <CheckSquare className="w-4 h-4 text-emerald-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
            </button>

            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                  {item.requirementId}
                </span>

                <span
                  className={`text-[10px] uppercase font-semibold px-2 py-0.2 rounded border ${
                    item.category === "code_test"
                      ? "bg-blue-500/10 text-blue-300 border-blue-500/20"
                      : item.category === "alternative_repo"
                      ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                      : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                  }`}
                >
                  {item.category.replace("_", " ")}
                </span>
              </div>

              <p className={`text-xs text-slate-200 leading-snug ${item.completed ? "text-slate-500" : ""}`}>
                {item.actionText}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
