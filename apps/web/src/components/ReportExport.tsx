import { useState } from "react";
import { Download, Printer, FileJson, FileCode, Check, Share2, Trash2 } from "lucide-react";
import { AssessmentReport } from "@parakh/contracts";
import { deleteReportById } from "../services/api";
import { TactileButton } from "./TactileButton.tsx";

interface ReportExportProps {
  report: AssessmentReport;
  viewToken?: string | null;
  onDelete?: () => void;
  className?: string;
}

export function ReportExport({ report, viewToken, onDelete, className = "" }: ReportExportProps) {
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
    if (!window.confirm("Are you sure you want to permanently delete this report and purge all associated records?")) {
      return;
    }
    setIsDeleting(true);
    try {
      const ok = await deleteReportById(report.id, viewToken);
      if (ok && onDelete) {
        onDelete();
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete report.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `parakh-assessment-${report.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setDownloadedJson(true);
    setTimeout(() => setDownloadedJson(false), 2000);
  };

  const handleDownloadHtml = () => {
    // Generate minimal printable HTML wrapper locally in browser if offline
    const shortSha = report.resolvedCommitSha.slice(0, 8);
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Parakh Report - ${report.id}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; }
    .container { max-width: 800px; margin: 0 auto; background: #1e293b; padding: 24px; border-radius: 12px; }
    h1 { margin-top: 0; color: #38bdf8; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { padding: 10px; border-bottom: 1px solid #334155; text-align: left; }
    th { color: #94a3b8; }
    @media print { body { background: #fff; color: #000; } .container { background: #fff; padding: 0; } }
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
          .join("")}
      </tbody>
    </table>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `parakh-report-${report.id}.html`);
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
    <div className={`p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-center justify-between flex-wrap gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Download className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-slate-200">Export & Share Report</h4>
          <p className="text-[11px] text-slate-400">
            Self-contained verification audits with embedded permalinks
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* JSON Export */}
        <TactileButton
          onClick={handleDownloadJson}
          variant="secondary"
          size="sm"
          rounded={14}
        >
          {downloadedJson ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5 inline" />
          ) : (
            <FileJson className="w-3.5 h-3.5 text-rose-400 mr-1.5 inline" />
          )}
          <span>JSON</span>
        </TactileButton>

        {/* HTML Export */}
        <TactileButton
          onClick={handleDownloadHtml}
          variant="secondary"
          size="sm"
          rounded={14}
        >
          {downloadedHtml ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5 inline" />
          ) : (
            <FileCode className="w-3.5 h-3.5 text-purple-400 mr-1.5 inline" />
          )}
          <span>HTML</span>
        </TactileButton>

        {/* Print / PDF */}
        <TactileButton
          onClick={handlePrint}
          variant="primary"
          size="sm"
          rounded={14}
        >
          <Printer className="w-3.5 h-3.5 mr-1.5 inline" />
          <span>Print / PDF</span>
        </TactileButton>

        {/* Share Link (if viewToken present) */}
        {viewToken && (
          <TactileButton
            onClick={handleCopyShareLink}
            variant="secondary"
            size="sm"
            rounded={14}
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5 inline" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-rose-400 mr-1.5 inline" />
            )}
            <span>{copiedLink ? "Link Copied!" : "Share Link"}</span>
          </TactileButton>
        )}

        {/* Delete Report */}
        {viewToken && onDelete && (
          <TactileButton
            onClick={handleDelete}
            disabled={isDeleting}
            variant="danger"
            size="sm"
            rounded={14}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5 inline" />
            <span>{isDeleting ? "Deleting..." : "Delete"}</span>
          </TactileButton>
        )}
      </div>
    </div>
  );
}
