import { useState } from "react";
import { Info, AlertCircle, FileCheck2, Filter, ChevronDown, ChevronUp } from "lucide-react";

interface TransparencyBannerProps {
  scannedFilesCount: number;
  skippedFilesCount: number;
  commitSha?: string;
  isTruncated?: boolean;
  className?: string;
}

export function TransparencyBanner({
  scannedFilesCount,
  skippedFilesCount,
  commitSha,
  isTruncated = false,
  className = "",
}: TransparencyBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md overflow-hidden transition-all duration-200 ${className}`}
    >
      <div className="p-4 sm:p-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-200">
                Evidence Grounding & Scan Scope Disclosure
              </h4>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
                Ethical Standard
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              <strong className="text-slate-300">"Not Demonstrated"</strong> indicates missing evidence in the analyzed repository snapshot, <span className="text-slate-300 italic">never</span> an absence of developer competence.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition shrink-0 flex items-center gap-1 font-medium"
        >
          <span className="hidden sm:inline">{isExpanded ? "Hide Details" : "Scan Details"}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Metrics & Disclaimers */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-800/60 bg-slate-950/40 space-y-3.5 text-xs">
          {/* Key Metric Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-2.5">
              <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-500 block">Scanned Files</span>
                <span className="font-semibold text-slate-200 font-mono text-sm">{scannedFilesCount}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-2.5">
              <Filter className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-500 block">Filtered / Skipped</span>
                <span className="font-semibold text-slate-200 font-mono text-sm">{skippedFilesCount}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 col-span-2 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 block">Pinned Commit Snapshot</span>
                <span className="font-semibold text-slate-300 font-mono text-xs">
                  {commitSha ? commitSha.slice(0, 10) : "Latest Tree Head"}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                Immutable
              </span>
            </div>
          </div>

          {/* Warning if truncated */}
          {isTruncated && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                File tree exceeded maximum evaluation size (1,000 files). Analysis represents the prioritized core application sources.
              </span>
            </div>
          )}

          {/* Grounding Guarantees */}
          <div className="text-slate-400 space-y-1 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-800/40">
            <p className="font-medium text-slate-300">Grounding Guarantees:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>Citations require exact line matches in the pinned repository tree.</li>
              <li>README mentions without code proof are automatically downgraded to "Partially Demonstrated".</li>
              <li>Unverified citations or ambiguous references are strictly downgraded to "Needs Review".</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
