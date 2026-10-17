import React from "react";
import { RequirementAssessment } from "@parakh/contracts";
import { GapChecklist as InnerGapChecklist } from "./ActionPlan/GapChecklist.tsx";
import { ClientQuestions } from "./ActionPlan/ClientQuestions.tsx";

export interface GapChecklistProps {
  assessments: RequirementAssessment[];
  className?: string;
}

export const GapChecklist: React.FC<GapChecklistProps> = ({
  assessments,
  className = "",
}) => {
  return (
    <div className={`space-y-8 ${className}`}>
      {/* 1. Actionable Spikes & Test Tasks */}
      <InnerGapChecklist assessments={assessments} />

      {/* 2. Client Clarification Questions */}
      <ClientQuestions assessments={assessments} />
    </div>
  );
};
