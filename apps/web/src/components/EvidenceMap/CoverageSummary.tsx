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
      className={`p-5 rounded-2xl bg-white border border-[#E2E5DE] space-y-4 shadow-xs ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#163300] text-[#9FE870]">
            <BarChart3 className="w-4 h-4 text-[#9FE870]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111111]">Capability Evidence Coverage</h3>
            <p className="text-xs text-[#5F625E]">
              Verified ground truth from repository scan ({total} total criteria)
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-[#163300] bg-[#9FE870]/30 px-3 py-1 rounded-full border border-[#9FE870]/60">
          {demonstrated + partiallyDemonstrated}/{total} addressed
        </span>
      </div>

      {/* Segmented Stacked Bar */}
      <div className="h-3 w-full rounded-full bg-[#F2F4F0] overflow-hidden flex border border-[#E2E5DE]">
        {demonstrated > 0 && (
          <div
            style={{ width: `${(demonstrated / total) * 100}%` }}
            className="bg-[#163300] transition-all duration-300"
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
            className="bg-sky-400 transition-all duration-300"
            title={`Needs Review: ${needsReview} (${needsReviewPct}%)`}
          />
        )}
        {notDemonstrated > 0 && (
          <div
            style={{ width: `${(notDemonstrated / total) * 100}%` }}
            className="bg-slate-300 transition-all duration-300"
            title={`Not Demonstrated: ${notDemonstrated} (${notDemonstratedPct}%)`}
          />
        )}
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {/* Demonstrated */}
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-900 mb-1">
            <span className="text-xs font-bold">Demonstrated</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-emerald-950">{demonstrated}</span>
            <span className="text-xs text-emerald-700 font-mono">({demonstratedPct}%)</span>
          </div>
        </div>

        {/* Partially Demonstrated */}
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-900 mb-1">
            <span className="text-xs font-bold">Partial</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-amber-950">{partiallyDemonstrated}</span>
            <span className="text-xs text-amber-700 font-mono">({partiallyDemonstratedPct}%)</span>
          </div>
        </div>

        {/* Needs Review */}
        <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-900 mb-1">
            <span className="text-xs font-bold">Needs Review</span>
            <AlertCircle className="w-3.5 h-3.5 text-sky-700" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-sky-950">{needsReview}</span>
            <span className="text-xs text-sky-700 font-mono">({needsReviewPct}%)</span>
          </div>
        </div>

        {/* Not Demonstrated */}
        <div className="p-3.5 rounded-2xl bg-[#F2F4F0] border border-[#E2E5DE] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#5F625E] mb-1">
            <span className="text-xs font-bold">Not Found</span>
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-[#111111]">{notDemonstrated}</span>
            <span className="text-xs text-[#5F625E] font-mono">({notDemonstratedPct}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
