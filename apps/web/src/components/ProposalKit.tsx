import React from "react";
import { RequirementAssessment } from "@parakh/contracts";
import { ResponseDraft } from "./ActionPlan/ResponseDraft.tsx";

export interface ProposalKitProps {
  assessments: RequirementAssessment[];
  repositoryUrl: string;
  opportunityTitle?: string;
  className?: string;
}

export const ProposalKit: React.FC<ProposalKitProps> = ({
  assessments,
  repositoryUrl,
  opportunityTitle = "Client Capability Assessment",
  className = "",
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <ResponseDraft
        assessments={assessments}
        repositoryUrl={repositoryUrl}
        opportunityTitle={opportunityTitle}
      />
    </div>
  );
};
