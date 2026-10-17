import { useState } from 'react';
import { LayoutGrid, List, FileCode, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { RequirementAssessment, Citation } from '@parakh/contracts';
import { StatusBadge } from '../ui/Badge';

export interface EvidenceMapProps {
  assessments: RequirementAssessment[];
  onSelectCitation?: (citation: Citation, assessment: RequirementAssessment) => void;
  onOpenOverride?: (assessment: RequirementAssessment) => void;
}

export function EvidenceMap({ assessments, onSelectCitation, onOpenOverride }: EvidenceMapProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (assessments.length === 0) {
    return (
      <section
        role="region"
        aria-label="Evidence Map Empty State"
        className="p-8 sm:p-12 text-center rounded-[28px] bg-[#F2F4F0] border border-[#E2E5DE]"
      >
        <p className="text-[#5F625E] text-sm">No requirement assessments available yet.</p>
      </section>
    );
  }

  return (
    <section role="region" aria-label="Evidence Map" className="space-y-6">
      {/* Top Controls: View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#111111] tracking-tight">Evidence Map</h2>
          <p className="text-xs text-[#5F625E] mt-0.5">
            Transparent mapping between client requirements and verified repository code.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Evidence view layout options"
          className="flex items-center self-start sm:self-auto bg-[#F2F4F0] p-1 rounded-2xl border border-[#E2E5DE]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'grid'}
            aria-label="Switch to Grid View"
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#163300] ${
              viewMode === 'grid'
                ? 'bg-white text-[#111111] shadow-sm'
                : 'text-[#5F625E] hover:text-[#111111]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Grid</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'list'}
            aria-label="Switch to List View"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#163300] ${
              viewMode === 'list'
                ? 'bg-white text-[#111111] shadow-sm'
                : 'text-[#5F625E] hover:text-[#111111]'
            }`}
          >
            <List className="w-3.5 h-3.5" aria-hidden="true" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Cards Layout */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6'
            : 'space-y-4'
        }
      >
        {assessments.map((item) => {
          const hasCitations = item.citations && item.citations.length > 0;
          return (
            <article
              key={item.requirementId}
              aria-label={`Assessment for requirement ${item.requirementId}`}
              className="p-6 rounded-[24px] bg-white border border-[#E2E5DE] hover:border-[#163300]/30 transition-all duration-200 flex flex-col justify-between group shadow-sm hover:shadow-md"
            >
              <div className="space-y-3.5">
                {/* Header: ID + Badges */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#F2F4F0] text-[#111111] border border-[#E2E5DE]">
                      {item.requirementId}
                    </span>
                    {item.manuallyOverridden && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        Manually Verified
                      </span>
                    )}
                  </div>
                  <StatusBadge status={item.status} size="sm" />
                </div>

                {/* Requirement Text */}
                <p className="text-sm font-bold text-[#111111] leading-snug">
                  {item.requirementText}
                </p>

                {/* Rationale */}
                <div className="text-xs text-[#5F625E] leading-relaxed bg-[#F2F4F0] p-4 rounded-xl border border-[#E2E5DE]">
                  <span className="font-bold text-[#111111] block mb-1">Assessment Rationale:</span>
                  {item.rationale}
                </div>

                {/* Downgrade alert if present */}
                {item.downgradeReason && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
                    <span>{item.downgradeReason}</span>
                  </div>
                )}

                {/* Limitations */}
                {item.limitations && (
                  <div className="text-xs text-[#5F625E]">
                    <span className="text-[#111111] font-semibold">Missing / Limitations: </span>
                    {item.limitations}
                  </div>
                )}
              </div>

              {/* Citations Footer & Actions */}
              <div className="mt-5 pt-3.5 border-t border-[#E2E5DE] flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {hasCitations ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <FileCode className="w-3.5 h-3.5 text-[#5F625E]" aria-hidden="true" />
                      <span className="text-xs font-medium text-[#5F625E]">
                        {item.citations.length} cited {item.citations.length === 1 ? 'proof' : 'proofs'}
                      </span>
                      <div className="flex items-center gap-1.5 ml-1 flex-wrap">
                        {item.citations.slice(0, 2).map((cit, idx) => (
                          <button
                            key={idx}
                            type="button"
                            aria-label={`Inspect evidence in ${cit.path}`}
                            onClick={() => onSelectCitation?.(cit, item)}
                            className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-[#F2F4F0] text-[#163300] hover:bg-[#9FE870]/40 font-bold border border-[#E2E5DE] transition inline-flex items-center gap-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#163300]"
                          >
                            <span>{cit.path.split('/').pop()}</span>
                            <ArrowUpRight className="w-2.5 h-2.5 opacity-60" aria-hidden="true" />
                          </button>
                        ))}
                        {item.citations.length > 2 && (
                          <button
                            type="button"
                            aria-label={`View ${item.citations.length - 2} additional citations`}
                            onClick={() => onSelectCitation?.(item.citations[0], item)}
                            className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[#F2F4F0] text-[#5F625E] hover:text-[#111111]"
                          >
                            +{item.citations.length - 2} more
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-[#828580] italic">No citations found in scan</span>
                  )}
                </div>

                {onOpenOverride && (
                  <button
                    type="button"
                    aria-label={`Adjust status for requirement ${item.requirementId}`}
                    onClick={() => onOpenOverride(item)}
                    className="text-xs font-bold text-[#163300] hover:underline transition rounded"
                  >
                    Adjust status
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default EvidenceMap;
