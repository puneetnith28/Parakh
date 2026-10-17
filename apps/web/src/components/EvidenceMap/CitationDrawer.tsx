import React, { useEffect } from "react";
import { X, ExternalLink, GitCommit, FileCode, CheckCircle2, ShieldCheck, Copy, Check } from "lucide-react";
import { Citation } from "@parakh/contracts";
import { CodeSnippet } from "../CodeSnippet.tsx";
import { TactileButton } from "../TactileButton.tsx";

export interface CitationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  citation: Citation | null;
  requirementTitle?: string;
}

/**
 * Construct exact immutable GitHub commit permalink with line anchors.
 * Format: https://github.com/:owner/:repo/blob/:sha/:path#L:start-L:end
 */
export function buildGitHubCommitPermalink(citation: Citation): string {
  if (citation.canonicalUrl && /#L\d+/.test(citation.canonicalUrl)) {
    return citation.canonicalUrl;
  }

  let base = citation.canonicalUrl;
  if (!base || !base.startsWith("http")) {
    const cleanRepo = (citation.repository || "owner/repo").replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
    base = `https://github.com/${cleanRepo}/blob/${citation.commitSha}/${citation.path}`;
  }

  if (citation.startLine && citation.endLine) {
    return `${base}#L${citation.startLine}-L${citation.endLine}`;
  }
  if (citation.startLine) {
    return `${base}#L${citation.startLine}`;
  }
  return base;
}

export function formatLineRangeText(startLine?: number, endLine?: number): string | null {
  if (startLine && endLine) {
    return `L${startLine}-L${endLine}`;
  }
  if (startLine) {
    return `L${startLine}`;
  }
  return null;
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({
  isOpen,
  onClose,
  citation,
  requirementTitle,
}) => {
  const [copiedSha, setCopiedSha] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !citation) return null;

  const shortSha = citation.commitSha ? citation.commitSha.slice(0, 7) : "unknown";
  const lineRangeText = formatLineRangeText(citation.startLine, citation.endLine);
  const permalinkUrl = buildGitHubCommitPermalink(citation);

  const handleCopySha = () => {
    if (citation.commitSha) {
      navigator.clipboard.writeText(citation.commitSha).then(() => {
        setCopiedSha(true);
        setTimeout(() => setCopiedSha(false), 2000);
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Code Citation Inspection Drawer"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-neutral-950 border border-red-950/60 rounded-2xl shadow-[0_0_50px_rgba(255,0,0,0.15)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-red-950/50 bg-black/80 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-red-500/10 text-rose-400 border border-red-500/20 inline-flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Grounding
              </span>
              <span className="text-xs font-mono text-zinc-400">ID: {citation.candidateId}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-900 text-zinc-300 capitalize">
                {citation.evidenceType || "source"} evidence
              </span>
            </div>

            <h3 className="text-base font-bold text-zinc-100 line-clamp-1">
              {citation.path.split("/").pop()}
            </h3>

            {requirementTitle && (
              <p className="text-xs text-zinc-400 line-clamp-1">
                Supports: <span className="text-zinc-300 font-medium">"{requirementTitle}"</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata Strip */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between gap-3 flex-wrap text-xs font-mono">
          <div className="flex items-center gap-4 flex-wrap text-slate-400">
            <div className="flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-300 truncate max-w-xs">{citation.path}</span>
            </div>

            {lineRangeText && (
              <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                {lineRangeText}
              </span>
            )}

            <button
              type="button"
              onClick={handleCopySha}
              title={`Copy commit SHA: ${citation.commitSha}`}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition group"
            >
              <GitCommit className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
              <span>{shortSha}</span>
              {copiedSha ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500 opacity-60" />}
            </button>
          </div>

          {/* GitHub Commit Permalink */}
          <a
            href={permalinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 border border-emerald-500/30 transition text-xs font-medium"
          >
            <span>Inspect on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Code Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <CodeSnippet
            code={citation.snippet}
            startLine={citation.startLine || 1}
          />

          {citation.supports && (
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-300 space-y-1">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Verified Substantive Content
              </span>
              <p>{citation.supports}</p>
            </div>
          )}

          {citation.limitations && (
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 space-y-1">
              <span className="text-amber-400 font-semibold">Scope Limitations</span>
              <p>{citation.limitations}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="italic truncate max-w-sm">
            Immutable snapshot pinned to <code className="text-slate-300">{shortSha}</code>
          </span>
          <TactileButton
            onClick={onClose}
            variant="secondary"
            size="sm"
            rounded={12}
          >
            Close
          </TactileButton>
        </div>
      </div>
    </div>
  );
};
