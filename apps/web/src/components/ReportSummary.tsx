import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  GitCommit,
  FileCode,
  Printer,
  Download,
} from 'lucide-react';
import { AssessmentReport } from '@parakh/contracts';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ProgressBar } from './ui/ProgressBar';
import { AudioBriefingPlayer } from './AudioBriefingPlayer';

export interface ReportSummaryProps {
  report: AssessmentReport;
  viewToken?: string | null;
  onExportPrint?: () => void;
  onExportJson?: () => void;
}

export const ReportSummary: React.FC<ReportSummaryProps> = ({
  report,
  viewToken,
  onExportPrint,
  onExportJson,
}) => {
  const { total, demonstrated, partiallyDemonstrated, notDemonstrated, needsReview } =
    report.coverageSummary;

  const pct = (val: number) => (total > 0 ? Math.round((val / total) * 100) : 0);
  const demonstratedPct = pct(demonstrated);
  const partialPct = pct(partiallyDemonstrated);
  const needsReviewPct = pct(needsReview);
  const notDemonstratedPct = pct(notDemonstrated);

  return (
    <div className="bg-[#F2F4F0] border border-[#E2E5DE] rounded-[28px] p-6 sm:p-10 space-y-8 shadow-sm">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#E2E5DE]">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant="lime" size="sm" dot dotColor="bg-[#163300]">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#163300]" />
              Cryptographic Provenance Verified
            </Badge>
            <span className="text-xs text-[#5F625E] font-mono">
              ID: {report.id}
            </span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl text-[#111111] uppercase tracking-tight">
            {report.opportunityTitle || 'Capability Assessment Report'}
          </h2>

          <div className="flex items-center gap-4 text-xs font-mono text-[#5F625E] flex-wrap pt-1">
            <span className="flex items-center gap-1.5 text-[#111111] font-medium">
              <FileCode className="w-4 h-4 text-[#163300]" />
              Repo:{' '}
              <a
                href={report.repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#163300] font-bold hover:underline"
              >
                {report.repositoryUrl.replace(/^https?:\/\/github\.com\//, '')}
              </a>
            </span>
            <span className="flex items-center gap-1.5">
              <GitCommit className="w-4 h-4 text-[#5F625E]" />
              Commit: <span className="font-bold text-[#111111]">{report.resolvedCommitSha?.slice(0, 7)}</span>
            </span>
            <span>
              Scanned: <span className="font-bold text-[#111111]">{report.scannedFilesCount} files</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          {onExportPrint && (
            <Button
              onClick={onExportPrint}
              variant="secondary"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5" />}
              className="font-bold text-xs"
            >
              Print Report
            </Button>
          )}
          {onExportJson && (
            <Button
              onClick={onExportJson}
              variant="secondary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              className="font-bold text-xs"
            >
              JSON Data
            </Button>
          )}
        </div>
      </div>

      {/* Executive Audio Briefing Player */}
      <AudioBriefingPlayer reportId={report.id} viewToken={viewToken} />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Demonstrated */}
        <div className="bg-white border border-[#E2E5DE] rounded-2xl p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#163300] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Demonstrated
            </span>
            <span className="text-xs font-mono font-bold text-[#163300] bg-[#9FE870]/30 px-2 py-0.5 rounded-full">
              {demonstratedPct}%
            </span>
          </div>
          <p className="text-3xl font-display text-[#111111] pt-1">{demonstrated}</p>
        </div>

        {/* Partially Demonstrated */}
        <div className="bg-white border border-[#E2E5DE] rounded-2xl p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-800 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Partial
            </span>
            <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
              {partialPct}%
            </span>
          </div>
          <p className="text-3xl font-display text-[#111111] pt-1">{partiallyDemonstrated}</p>
        </div>

        {/* Needs Review */}
        <div className="bg-white border border-[#E2E5DE] rounded-2xl p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-sky-800 font-bold flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              Needs Review
            </span>
            <span className="text-xs font-mono font-bold text-sky-900 bg-sky-100 px-2 py-0.5 rounded-full">
              {needsReviewPct}%
            </span>
          </div>
          <p className="text-3xl font-display text-[#111111] pt-1">{needsReview}</p>
        </div>

        {/* Not Demonstrated */}
        <div className="bg-white border border-[#E2E5DE] rounded-2xl p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-800 font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Not Found
            </span>
            <span className="text-xs font-mono font-bold text-rose-900 bg-rose-100 px-2 py-0.5 rounded-full">
              {notDemonstratedPct}%
            </span>
          </div>
          <p className="text-3xl font-display text-[#111111] pt-1">{notDemonstrated}</p>
        </div>
      </div>

      {/* Progress Breakdown Bar */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E5DE] space-y-2.5 shadow-sm">
        <div className="flex justify-between items-center text-xs font-bold text-[#111111]">
          <span>Demonstrated Evidence Coverage</span>
          <span className="text-[#163300] font-mono text-sm">{demonstratedPct}% Verified</span>
        </div>
        <ProgressBar value={demonstrated} max={total || 1} variant="lime" size="md" />
      </div>
    </div>
  );
};

export default ReportSummary;
