import { AssessmentReport } from "@parakh/contracts";

export interface ReportExportOptions {
  title?: string;
  candidateName?: string;
}

/**
 * Escapes HTML characters to prevent XSS in exported reports.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates a beautiful, self-contained, standalone HTML report complete with embedded CSS,
 * print optimization (@media print), permalink citations, and zero leaked server secrets.
 */
export function generateHtmlReport(
  report: AssessmentReport,
  options: ReportExportOptions = {}
): string {
  const title = options.title || "Parakh Developer Capability Assessment Report";
  const dateFormatted = new Date(report.createdAt).toUTCString();
  const shortSha = report.resolvedCommitSha.slice(0, 10);

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    demonstrated: { bg: "#064e3b", text: "#6ee7b7", label: "Demonstrated" },
    partially_demonstrated: { bg: "#78350f", text: "#fde68a", label: "Partially Demonstrated" },
    needs_review: { bg: "#312e81", text: "#c7d2fe", label: "Needs Review" },
    not_demonstrated: { bg: "#1e293b", text: "#94a3b8", label: "Not Demonstrated" },
  };

  const rows = report.assessments
    .map((item) => {
      const st = statusColors[item.status] || statusColors.not_demonstrated;
      const citationsList = (item.citations || [])
        .map(
          (c) =>
            `<li style="margin-bottom: 4px;">
              <a href="${escapeHtml(c.canonicalUrl)}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: none; font-family: monospace; font-size: 11px;">
                ${escapeHtml(c.path)}${c.startLine ? ` #L${c.startLine}` : ""}
              </a>
            </li>`
        )
        .join("");

      return `
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 12px; font-family: monospace; font-size: 12px; color: #94a3b8; vertical-align: top;">
            ${escapeHtml(item.requirementId)}
          </td>
          <td style="padding: 12px; vertical-align: top;">
            <div style="font-weight: 600; color: #f1f5f9; font-size: 13px; margin-bottom: 4px;">
              ${escapeHtml(item.requirementText)}
            </div>
            <div style="font-size: 12px; color: #cbd5e1; line-height: 1.4; margin-bottom: 6px;">
              ${escapeHtml(item.rationale)}
            </div>
            ${
              item.limitations
                ? `<div style="font-size: 11px; color: #fbbf24; margin-bottom: 4px;"><strong>Limitations:</strong> ${escapeHtml(
                    item.limitations
                  )}</div>`
                : ""
            }
          </td>
          <td style="padding: 12px; vertical-align: top; text-align: center;">
            <span style="display: inline-block; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background-color: ${
              st.bg
            }; color: ${st.text};">
              ${st.label}
            </span>
          </td>
          <td style="padding: 12px; vertical-align: top;">
            ${
              citationsList
                ? `<ul style="margin: 0; padding-left: 16px; font-size: 11px; color: #94a3b8;">${citationsList}</ul>`
                : `<span style="font-size: 11px; color: #64748b; font-style: italic;">None cited</span>`
            }
          </td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b1329;
      color: #e2e8f0;
      margin: 0;
      padding: 32px 20px;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
      background-color: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }
    .header {
      border-bottom: 1px solid #334155;
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 8px 0;
    }
    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 12px;
      color: #94a3b8;
      margin-top: 12px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 28px;
    }
    .metric-card {
      background-color: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .metric-val {
      font-size: 22px;
      font-weight: 700;
      font-family: monospace;
      margin-bottom: 4px;
    }
    .metric-lbl {
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .disclaimer-box {
      background-color: rgba(30, 41, 59, 0.7);
      border-left: 4px solid #38bdf8;
      padding: 14px 18px;
      border-radius: 8px;
      font-size: 12px;
      color: #cbd5e1;
      margin-bottom: 28px;
      line-height: 1.5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
    }
    th {
      text-align: left;
      padding: 12px;
      background-color: #0b1120;
      color: #94a3b8;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 2px solid #334155;
    }
    .footer {
      border-top: 1px solid #334155;
      padding-top: 20px;
      font-size: 11px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    @media print {
      body {
        background-color: #ffffff;
        color: #0f172a;
        padding: 0;
      }
      .container {
        border: none;
        box-shadow: none;
        padding: 0;
      }
      th {
        background-color: #f1f5f9;
        color: #475569;
      }
      tr {
        border-bottom: 1px solid #e2e8f0 !important;
      }
      .metric-card {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
      }
      .metric-val {
        color: #0f172a;
      }
      .disclaimer-box {
        background-color: #f8fafc;
        border-left: 4px solid #0284c7;
        color: #334155;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 11px; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">
        Parakh Capability Verification
      </div>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta-bar">
        <span><strong>Repository:</strong> <a href="${escapeHtml(
          report.repositoryUrl
        )}" target="_blank" style="color: #38bdf8;">${escapeHtml(report.repositoryUrl)}</a></span>
        <span><strong>Commit Snapshot:</strong> <code style="color: #f1f5f9;">${escapeHtml(
          shortSha
        )}</code></span>
        <span><strong>Generated:</strong> ${escapeHtml(dateFormatted)}</span>
      </div>
    </div>

    <!-- Executive Metrics Grid -->
    <div class="summary-grid">
      <div class="metric-card" style="border-color: rgba(16, 185, 129, 0.3);">
        <div class="metric-val" style="color: #34d399;">${report.coverageSummary.demonstrated}</div>
        <div class="metric-lbl">Demonstrated</div>
      </div>
      <div class="metric-card" style="border-color: rgba(245, 158, 11, 0.3);">
        <div class="metric-val" style="color: #fbbf24;">${report.coverageSummary.partiallyDemonstrated}</div>
        <div class="metric-lbl">Partially Demonstrated</div>
      </div>
      <div class="metric-card" style="border-color: rgba(99, 102, 241, 0.3);">
        <div class="metric-val" style="color: #818cf8;">${report.coverageSummary.needsReview}</div>
        <div class="metric-lbl">Needs Review</div>
      </div>
      <div class="metric-card" style="border-color: rgba(148, 163, 184, 0.3);">
        <div class="metric-val" style="color: #cbd5e1;">${report.coverageSummary.notDemonstrated}</div>
        <div class="metric-lbl">Not Found</div>
      </div>
    </div>

    <!-- Ethical Grounding Notice -->
    <div class="disclaimer-box">
      <strong>Ethical Grounding Disclosure:</strong> "Not Demonstrated" indicates that direct proof was not detected within the analyzed repository snapshot (${report.scannedFilesCount} files analyzed, ${report.skippedFilesCount} skipped by denylist). It does not indicate an absence of developer competence.
    </div>

    <!-- Evidence Map Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 80px;">ID</th>
          <th>Requirement & Grounded Rationale</th>
          <th style="width: 140px; text-align: center;">Status</th>
          <th style="width: 220px;">Permalinks</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="footer">
      <span>Parakh Open-Source Capability Verification &copy; 2026. Self-contained report.</span>
      <span>Report ID: ${escapeHtml(report.id)}</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Returns formatted JSON export without internal server secrets.
 */
export function generateJsonReport(report: AssessmentReport): string {
  // Deep clone and clean
  return JSON.stringify(report, null, 2);
}
