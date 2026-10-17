import { useState } from "react";
import { CheckSquare, Square, CheckCircle, ListTodo } from "lucide-react";
import { RequirementAssessment } from "@parakh/contracts";
import { Badge } from "../ui/Badge";

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
      <div className={`p-8 rounded-3xl bg-white border border-[#E2E5DE] text-center space-y-3 font-sans shadow-xs ${className}`}>
        <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
        <h4 className="text-base font-bold text-[#111111]">Zero Technical Gaps Detected</h4>
        <p className="text-xs text-[#5F625E] max-w-md mx-auto">
          All extracted client requirements have verified source code and test proof in your repository snapshot.
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
            <ListTodo className="w-4 h-4 text-[#163300]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#5F625E]">Remediation Plan</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
            Gap Resolution Action Plan
          </h3>
          <p className="text-xs sm:text-sm text-[#5F625E]">
            Actionable steps to close unverified requirements prior to final proposal delivery.
          </p>
        </div>

        <Badge variant={completedCount === totalCount ? "success" : "dark"} size="md">
          {completedCount} of {totalCount} completed
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="h-2 w-full bg-[#F2F4F0] rounded-full overflow-hidden border border-[#E2E5DE]">
          <div
            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            className="h-full bg-[#163300] transition-all duration-300 rounded-full"
          />
        </div>
      </div>

      {/* Action Items List */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 select-none ${
              item.completed
                ? "bg-[#F8F9F7] border-[#E2E5DE] opacity-60 line-through text-[#828580]"
                : "bg-white border-[#E2E5DE] hover:border-[#163300] text-[#111111] shadow-xs hover:shadow-sm"
            }`}
          >
            <button
              type="button"
              className="mt-0.5 text-[#5F625E] hover:text-[#163300] transition shrink-0"
              aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
            >
              {item.completed ? (
                <CheckSquare className="w-5 h-5 text-[#163300]" />
              ) : (
                <Square className="w-5 h-5 text-[#CBD0C5]" />
              )}
            </button>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F2F4F0] text-[#163300]">
                  {item.requirementId}
                </span>

                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    item.category === "code_test"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : item.category === "alternative_repo"
                      ? "bg-purple-50 text-purple-800 border border-purple-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  {item.category.replace("_", " ")}
                </span>
              </div>

              <p className={`text-xs sm:text-sm font-medium leading-relaxed ${item.completed ? "text-[#828580]" : "text-[#111111]"}`}>
                {item.actionText}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GapChecklist;
