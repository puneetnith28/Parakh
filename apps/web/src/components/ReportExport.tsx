import { useState } from 'react';
import { Download, Printer, FileJson, FileCode, Check, Share2, Trash2 } from 'lucide-react';
import { AssessmentReport } from '@parakh/contracts';
import { deleteReportById } from '../services/api';
import { Button } from './ui/Button';

export interface ReportExportProps {
  report: AssessmentReport;
  viewToken?: string | null;
  onDelete?: () => void;
  className?: string;
}

export function ReportExport({ report, viewToken, onDelete, className = '' }: ReportExportProps) {
  const [downloadedJson, setDownloadedJson] = useState(false);
  const [downloadedHtml, setDownloadedHtml] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopyShareLink = async () => {
    if (!viewToken) return;
    const shareUrl = `${window.location.origin}/?reportId=${encodeURIComponent(report.id)}&token=${encodeURIComponent(viewToken)}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDelete = async () => {
    if (!viewToken) return;
    if (!window.confirm('Are you sure you want to permanently delete this report and purge all associated records?')) {
      return;
    }
    setIsDeleting(true);
    try {
      const ok = await deleteReportById(report.id, viewToken);
      if (ok && onDelete) {
        onDelete();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete report.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `parakh-assessment-${report.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setDownloadedJson(true);
    setTimeout(() => setDownloadedJson(false), 2000);
  };

  const handleDownloadHtml = () => {
    const shortSha = report.resolvedCommitSha.slice(0, 8);
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Parakh Report - ${report.id}</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; background: #ffffff; color: #111111; padding: 32px; }
    .container { max-width: 860px; margin: 0 auto; background: #f2f4f0; padding: 32px; border-radius: 20px; }
    h1 { margin-top: 0; color: #163300; font-size: 24px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #ffffff; border-radius: 12px; overflow: hidden; }
    th, td { padding: 12px 16px; border-bottom: 1px solid #e2e5de; text-align: left; }
    th { color: #5f625e; font-size: 12px; background: #f8f9f7; }
    @media print { body { background: #fff; color: #000; padding: 0; } .container { background: #fff; padding: 0; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>Parakh Capability Assessment</h1>
    <p>Repository: ${report.repositoryUrl} (Commit: ${shortSha})</p>
    <p>Scanned files: ${report.scannedFilesCount} | Skipped files: ${report.skippedFilesCount}</p>
    <table>
      <thead>
        <tr><th>ID</th><th>Requirement</th><th>Status</th><th>Rationale</th></tr>
      </thead>
      <tbody>
        ${report.assessments
          .map(
            (a) => `<tr>
          <td>${a.requirementId}</td>
          <td><strong>${a.requirementText}</strong></td>
          <td>${a.status}</td>
          <td>${a.rationale}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `parakh-report-${report.id}.html`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);

    setDownloadedHtml(true);
    setTimeout(() => setDownloadedHtml(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`p-5 rounded-[24px] bg-white border border-[#E2E5DE] shadow-sm flex items-center justify-between flex-wrap gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#163300] text-[#9FE870] flex items-center justify-center shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[#111111]">Export & Share Verification Audit</h4>
          <p className="text-xs text-[#5F625E]">
            Self-contained verification reports with embedded commit permalinks
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* JSON Export */}
        <Button
          onClick={handleDownloadJson}
          variant="secondary"
          size="sm"
          icon={
            downloadedJson ? (
              <Check className="w-3.5 h-3.5 text-[#163300]" />
            ) : (
              <FileJson className="w-3.5 h-3.5 text-[#5F625E]" />
            )
          }
          className="font-bold text-xs"
        >
          JSON
        </Button>

        {/* HTML Export */}
        <Button
          onClick={handleDownloadHtml}
          variant="secondary"
          size="sm"
          icon={
            downloadedHtml ? (
              <Check className="w-3.5 h-3.5 text-[#163300]" />
            ) : (
              <FileCode className="w-3.5 h-3.5 text-[#5F625E]" />
            )
          }
          className="font-bold text-xs"
        >
          HTML
        </Button>

        {/* Print / PDF */}
        <Button
          onClick={handlePrint}
          variant="primary"
          size="sm"
          icon={<Printer className="w-3.5 h-3.5" />}
          className="font-bold text-xs shadow-sm"
        >
          Print / PDF
        </Button>

        {/* Share Link */}
        {viewToken && (
          <Button
            onClick={handleCopyShareLink}
            variant="secondary"
            size="sm"
            icon={
              copiedLink ? (
                <Check className="w-3.5 h-3.5 text-[#163300]" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-[#5F625E]" />
              )
            }
            className="font-bold text-xs"
          >
            {copiedLink ? 'Link Copied!' : 'Share Link'}
          </Button>
        )}

        {/* Delete Report */}
        {viewToken && onDelete && (
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            variant="ghost"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
            className="font-bold text-xs text-rose-600 hover:bg-rose-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default ReportExport;
