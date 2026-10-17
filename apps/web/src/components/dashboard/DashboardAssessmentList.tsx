import React from 'react';
import {
  GitBranch,
  ChevronRight,
  Clock,
  Plus,
  Trash2,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface AssessmentSummaryItem {
  id: string;
  opportunityTitle: string;
  repositoryUrl: string;
  commitSha: string;
  createdAt: string;
  demonstratedCount: number;
  partiallyDemonstratedCount: number;
  notDemonstratedCount: number;
  needsReviewCount: number;
  totalRequirements: number;
  provenanceVerified: boolean;
  viewToken?: string;
}

export interface DashboardAssessmentListProps {
  assessments: AssessmentSummaryItem[];
  onSelectAssessment: (id: string) => void;
  onNewAssessment: () => void;
  onDeleteAssessment?: (id: string) => void;
}

export const DashboardAssessmentList: React.FC<DashboardAssessmentListProps> = ({
  assessments,
  onSelectAssessment,
  onNewAssessment,
  onDeleteAssessment,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl font-bold text-[#111111]">Evaluated Repositories</h2>
          <p className="text-xs text-[#5F625E] mt-0.5">
            Cryptographically sealed assessments with pinned commit references
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={onNewAssessment}
          icon={<Plus className="w-4 h-4" />}
          className="font-bold text-xs shadow-sm self-start sm:self-auto"
        >
          New evaluation
        </Button>
      </div>

      {/* Assessment Cards */}
      <div className="grid grid-cols-1 gap-4">
        {assessments.map((item) => {
          const demonstratedPct = item.totalRequirements > 0
            ? Math.round((item.demonstratedCount / item.totalRequirements) * 100)
            : 0;

          return (
            <Card
              key={item.id}
              variant="white"
              padding="md"
              hoverable
              onClick={() => onSelectAssessment(item.id)}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 group border border-[#E2E5DE]"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-base text-[#111111] truncate group-hover:text-[#163300] transition-colors">
                    {item.opportunityTitle}
                  </h3>
                  {item.provenanceVerified && (
                    <Badge variant="lime" size="sm" dot dotColor="bg-[#163300]">
                      Proven
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#5F625E]">
                  <span className="flex items-center gap-1.5 text-[#111111]">
                    <GitBranch className="w-3.5 h-3.5 text-[#163300]" />
                    {item.repositoryUrl.replace('https://github.com/', '')}
                  </span>
                  <span>
                    sha:{item.commitSha.slice(0, 7)}
                  </span>
                  <span className="flex items-center gap-1 text-[#828580]">
                    <Clock className="w-3 h-3" />
                    {item.createdAt}
                  </span>
                </div>

                {/* Score & Category breakdown pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-[#163300] bg-[#9FE870]/30 border border-[#9FE870]/60 px-2.5 py-0.5 rounded-full">
                    {demonstratedPct}% Demonstrated ({item.demonstratedCount}/{item.totalRequirements})
                  </span>
                  {item.partiallyDemonstratedCount > 0 && (
                    <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      {item.partiallyDemonstratedCount} Partial
                    </span>
                  )}
                  {item.needsReviewCount > 0 && (
                    <span className="text-[11px] text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                      {item.needsReviewCount} Needs Review
                    </span>
                  )}
                </div>
              </div>

              {/* Right Action buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {onDeleteAssessment && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAssessment(item.id);
                    }}
                    className="p-2 rounded-full text-[#828580] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Remove from history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <span className="text-xs font-bold text-[#163300] hidden sm:inline-block group-hover:underline">
                  View Report
                </span>
                <div className="w-8 h-8 rounded-full bg-[#F2F4F0] flex items-center justify-center text-[#111111] group-hover:bg-[#163300] group-hover:text-white transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardAssessmentList;
