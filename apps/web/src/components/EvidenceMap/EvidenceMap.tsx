import { useState } from "react";
import { LayoutGrid, List, FileCode, AlertTriangle, ArrowUpRight } from "lucide-react";
import { RequirementAssessment, Citation } from "@parakh/contracts";
import { StatusBadge } from "./StatusBadge.tsx";

interface EvidenceMapProps {
  assessments: RequirementAssessment[];
  onSelectCitation?: (citation: Citation, assessment: RequirementAssessment) => void;
  onOpenOverride?: (assessment: RequirementAssessment) => void;
}

export function EvidenceMap({ assessments, onSelectCitation, onOpenOverride }: EvidenceMapProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  if (assessments.length === 0) {
    return (
      <section
        role="region"
        aria-label="Evidence Map Empty State"
        className="p-8 sm:p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm"
      >
        <p className="text-slate-400 text-sm">No requirement assessments available yet.</p>
      </section>
    );
  }

  return (
    <section role="region" aria-label="Evidence Map" className="space-y-6">
      {/* Top Controls: View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 tracking-tight">Evidence Map</h2>
          <p className="text-xs text-slate-400">
            Transparent mapping between client requirements and verified repository code.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Evidence view layout options"
          className="flex items-center self-start sm:self-auto bg-slate-900/80 p-1 rounded-xl border border-slate-800/80"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "grid"}
            aria-label="Switch to Grid View"
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              viewMode === "grid"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutGrid className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "list"}
            aria-label="Switch to List View"
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              viewMode === "list"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <List className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Cards Layout */}
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4"
            : "space-y-3"
        }
      >
        {assessments.map((item) => {
          const hasCitations = item.citations && item.citations.length > 0;
          return (
            <article
              key={item.requirementId}
              aria-label={`Assessment for requirement ${item.requirementId}`}
              className={`p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-200 flex flex-col justify-between group shadow-sm hover:shadow-md ${
                item.status === "demonstrated"
                  ? "hover:border-emerald-500/30"
                  : item.status === "partially_demonstrated"
                  ? "hover:border-amber-500/30"
                  : item.status === "needs_review"
                  ? "hover:border-indigo-500/30"
                  : "hover:border-slate-700"
              }`}
            >
              <div className="space-y-3">
                {/* Header: ID + Badges */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/50">
                      {item.requirementId}
                    </span>
                    {item.manuallyOverridden && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Manually Verified
                      </span>
                    )}
                  </div>
                  <StatusBadge status={item.status} size="sm" />
                </div>

                {/* Requirement Text */}
                <p className="text-sm font-semibold text-slate-100 leading-snug">
                  {item.requirementText}
                </p>

                {/* Rationale */}
                <div className="text-xs text-slate-300/90 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
                  <span className="font-medium text-slate-400 block mb-1">Assessment Rationale:</span>
                  {item.rationale}
                </div>

                {/* Downgrade alert if present */}
                {item.downgradeReason && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-300"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" aria-hidden="true" />
                    <span>{item.downgradeReason}</span>
                  </div>
                )}

                {/* Limitations */}
                {item.limitations && (
                  <div className="text-xs text-slate-400">
                    <span className="text-slate-500 font-medium">Missing / Limitations: </span>
                    {item.limitations}
                  </div>
                )}
              </div>

              {/* Citations Footer & Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {hasCitations ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <FileCode className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      <span className="text-xs font-medium text-slate-300">
                        {item.citations.length} cited {item.citations.length === 1 ? "proof" : "proofs"}
                      </span>
                      <div className="flex items-center gap-1 ml-1 flex-wrap">
                        {item.citations.slice(0, 2).map((cit, idx) => (
                          <button
                            key={idx}
                            type="button"
                            aria-label={`Inspect evidence in ${cit.path}`}
                            onClick={() => onSelectCitation?.(cit, item)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelectCitation?.(cit, item);
                              }
                            }}
                            className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/90 text-emerald-300 hover:bg-slate-700 hover:text-emerald-200 border border-slate-700/60 transition inline-flex items-center gap-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
                          >
                            <span>{cit.path.split("/").pop()}</span>
                            <ArrowUpRight className="w-2.5 h-2.5 opacity-60" aria-hidden="true" />
                          </button>
                        ))}
                        {item.citations.length > 2 && (
                          <button
                            type="button"
                            aria-label={`View ${item.citations.length - 2} additional citations`}
                            onClick={() => onSelectCitation?.(item.citations[0], item)}
                            className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-400"
                          >
                            +{item.citations.length - 2} more
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">No citations found in scan</span>
                  )}
                </div>

                {onOpenOverride && (
                  <button
                    type="button"
                    aria-label={`Adjust status for requirement ${item.requirementId}`}
                    onClick={() => onOpenOverride(item)}
                    className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 rounded"
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
