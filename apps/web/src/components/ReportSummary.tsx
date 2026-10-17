import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, ShieldCheck, GitCommit, FileCode, Printer, Download } from "lucide-react";
import { AssessmentReport } from "@parakh/contracts";
import { TactileButton } from "./TactileButton.tsx";

export interface ReportSummaryProps {
  report: AssessmentReport;
  onExportPrint?: () => void;
  onExportJson?: () => void;
}

export const ReportSummary: React.FC<ReportSummaryProps> = ({
  report,
  onExportPrint,
  onExportJson,
}) => {
  const { total, demonstrated, partiallyDemonstrated, notDemonstrated, needsReview } = report.coverageSummary;

  const pct = (val: number) => (total > 0 ? Math.round((val / total) * 100) : 0);
  const demonstratedPct = pct(demonstrated);
  const partialPct = pct(partiallyDemonstrated);
  const unaddressedPct = pct(notDemonstrated + needsReview);

  return (
    <div className="bg-neutral-950/80 border border-red-950/40 backdrop-blur-md rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-black/80">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-red-950/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 text-rose-300 border border-red-500/30 text-xs font-semibold font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              Verified Evidence Grounding
            </span>
            <span className="text-xs text-neutral-500 font-mono">ID: {report.id}</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {report.opportunityTitle || "Capability Assessment Report"}
          </h2>
          <div className="flex items-center gap-4 text-xs font-mono text-neutral-400 flex-wrap pt-1">
            <span className="flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-neutral-500" />
              Repo:{" "}
              <a
                href={report.repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="text-rose-400 hover:underline"
              >
                {report.repositoryUrl.replace(/^https?:\/\/github\.com\//, "")}
              </a>
            </span>
            <span className="flex items-center gap-1.5">
              <GitCommit className="w-3.5 h-3.5 text-slate-500" />
              Commit: <span className="text-slate-300">{report.resolvedCommitSha?.slice(0, 7)}</span>
            </span>
            <span>
              Scanned: <span className="text-slate-300">{report.scannedFilesCount} files</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onExportPrint && (
            <TactileButton
              onClick={onExportPrint}
              variant="secondary"
              size="sm"
              rounded={14}
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 inline" />
              Print Report
            </TactileButton>
          )}
          {onExportJson && (
            <TactileButton
              onClick={onExportJson}
              variant="secondary"
              size="sm"
              rounded={14}
            >
              <Download className="w-3.5 h-3.5 mr-1.5 inline" />
              JSON Data
            </TactileButton>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Demonstrated */}
        <div className="bg-slate-950/60 border border-emerald-500/20 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Demonstrated
            </span>
            <span className="text-xs font-mono text-emerald-400/80">{demonstratedPct}%</span>
          </div>
          <p className="text-2xl font-extrabold text-white">{demonstrated}</p>
          <p className="text-[11px] text-slate-500">Verified code & test proof</p>
        </div>

        {/* Partially Demonstrated */}
        <div className="bg-slate-950/60 border border-amber-500/20 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Partial
            </span>
            <span className="text-xs font-mono text-amber-400/80">{partialPct}%</span>
          </div>
          <p className="text-2xl font-extrabold text-white">{partiallyDemonstrated}</p>
          <p className="text-[11px] text-slate-500">Code exists, missing tests</p>
        </div>

        {/* Needs Review */}
        <div className="bg-slate-950/60 border border-indigo-500/20 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-400 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Needs Review
            </span>
            <span className="text-xs font-mono text-indigo-400/80">{pct(needsReview)}%</span>
          </div>
          <p className="text-2xl font-extrabold text-white">{needsReview}</p>
          <p className="text-[11px] text-slate-500">Doc/config claims only</p>
        </div>

        {/* Not Demonstrated */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              Unaddressed
            </span>
            <span className="text-xs font-mono text-slate-400">{unaddressedPct}%</span>
          </div>
          <p className="text-2xl font-extrabold text-white">{notDemonstrated}</p>
          <p className="text-[11px] text-slate-500">Not found in repo files</p>
        </div>
      </div>

      {/* Progress Multi-Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Overall Proof Grounding Distribution</span>
          <span className="font-mono">{demonstrated} of {total} proven</span>
        </div>
        <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden flex">
          <div style={{ width: `${demonstratedPct}%` }} className="bg-emerald-500 transition-all duration-500" />
          <div style={{ width: `${partialPct}%` }} className="bg-amber-400 transition-all duration-500" />
          <div style={{ width: `${pct(needsReview)}%` }} className="bg-indigo-500 transition-all duration-500" />
          <div style={{ width: `${pct(notDemonstrated)}%` }} className="bg-slate-800 transition-all duration-500" />
        </div>
      </div>
    </div>
  );
};
