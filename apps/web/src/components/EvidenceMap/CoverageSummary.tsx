import { CheckCircle2, AlertTriangle, HelpCircle, AlertCircle, BarChart3 } from "lucide-react";

export interface CoverageData {
  total: number;
  demonstrated: number;
  partiallyDemonstrated: number;
  notDemonstrated: number;
  needsReview: number;
}

interface CoverageSummaryProps {
  summary: CoverageData;
  className?: string;
}

export function calculatePercentages(summary: CoverageData) {
  const { total, demonstrated, partiallyDemonstrated, notDemonstrated, needsReview } = summary;
  if (total <= 0) {
    return {
      demonstratedPct: 0,
      partiallyDemonstratedPct: 0,
      notDemonstratedPct: 0,
      needsReviewPct: 0,
    };
  }
  return {
    demonstratedPct: Math.round((demonstrated / total) * 100),
    partiallyDemonstratedPct: Math.round((partiallyDemonstrated / total) * 100),
    notDemonstratedPct: Math.round((notDemonstrated / total) * 100),
    needsReviewPct: Math.round((needsReview / total) * 100),
  };
}

export function CoverageSummary({ summary, className = "" }: CoverageSummaryProps) {
  const { total, demonstrated, partiallyDemonstrated, notDemonstrated, needsReview } = summary;
  const {
    demonstratedPct,
    partiallyDemonstratedPct,
    notDemonstratedPct,
    needsReviewPct,
  } = calculatePercentages(summary);

  return (
    <div
      className={`p-5 rounded-2xl bg-neutral-950/75 border border-red-950/40 backdrop-blur-md space-y-4 shadow-xl ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-500/10 text-rose-400 border border-red-500/20">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Capability Evidence Coverage</h3>
            <p className="text-xs text-zinc-400">
              Verified ground truth from repository scan ({total} total criteria)
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-medium text-rose-300 bg-black/60 px-2.5 py-1 rounded-lg border border-red-950/60">
          {demonstrated + partiallyDemonstrated}/{total} addressed
        </span>
      </div>

      {/* Segmented Stacked Bar */}
      <div className="h-3 w-full rounded-full bg-slate-950 overflow-hidden flex border border-slate-800/60">
        {demonstrated > 0 && (
          <div
            style={{ width: `${(demonstrated / total) * 100}%` }}
            className="bg-emerald-500 transition-all duration-300"
            title={`Demonstrated: ${demonstrated} (${demonstratedPct}%)`}
          />
        )}
        {partiallyDemonstrated > 0 && (
          <div
            style={{ width: `${(partiallyDemonstrated / total) * 100}%` }}
            className="bg-amber-400 transition-all duration-300"
            title={`Partially Demonstrated: ${partiallyDemonstrated} (${partiallyDemonstratedPct}%)`}
          />
        )}
        {needsReview > 0 && (
          <div
            style={{ width: `${(needsReview / total) * 100}%` }}
            className="bg-indigo-400 transition-all duration-300"
            title={`Needs Review: ${needsReview} (${needsReviewPct}%)`}
          />
        )}
        {notDemonstrated > 0 && (
          <div
            style={{ width: `${(notDemonstrated / total) * 100}%` }}
            className="bg-slate-700 transition-all duration-300"
            title={`Not Demonstrated: ${notDemonstrated} (${notDemonstratedPct}%)`}
          />
        )}
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {/* Demonstrated */}
        <div className="p-3 rounded-xl bg-slate-950/50 border border-emerald-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-xs font-medium">Demonstrated</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-emerald-300">{demonstrated}</span>
            <span className="text-xs text-emerald-400/80 font-mono">({demonstratedPct}%)</span>
          </div>
        </div>

        {/* Partially Demonstrated */}
        <div className="p-3 rounded-xl bg-slate-950/50 border border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-xs font-medium">Partial</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-amber-300">{partiallyDemonstrated}</span>
            <span className="text-xs text-amber-400/80 font-mono">({partiallyDemonstratedPct}%)</span>
          </div>
        </div>

        {/* Needs Review */}
        <div className="p-3 rounded-xl bg-slate-950/50 border border-indigo-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-400 mb-1">
            <span className="text-xs font-medium">Needs Review</span>
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-indigo-300">{needsReview}</span>
            <span className="text-xs text-indigo-400/80 font-mono">({needsReviewPct}%)</span>
          </div>
        </div>

        {/* Not Demonstrated */}
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-700/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Not Found</span>
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-200">{notDemonstrated}</span>
            <span className="text-xs text-slate-400 font-mono">({notDemonstratedPct}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
