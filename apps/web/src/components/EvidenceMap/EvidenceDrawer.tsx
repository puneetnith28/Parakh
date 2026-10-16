import { useEffect } from "react";
import { X, ExternalLink, GitCommit, FileCode, CheckCircle2, ShieldCheck } from "lucide-react";
import { Citation } from "@parakh/contracts";
import { CodeSnippet } from "../CodeSnippet.tsx";

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  citation: Citation | null;
  requirementTitle?: string;
}

export function EvidenceDrawer({
  isOpen,
  onClose,
  citation,
  requirementTitle,
}: EvidenceDrawerProps) {
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

  const shortSha = citation.commitSha.slice(0, 7);
  const lineRangeText =
    citation.startLine && citation.endLine
      ? `L${citation.startLine}-L${citation.endLine}`
      : citation.startLine
      ? `L${citation.startLine}`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800/80 bg-slate-900/90 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Grounding
              </span>
              <span className="text-xs font-mono text-slate-400">ID: {citation.candidateId}</span>
            </div>

            <h3 className="text-base font-bold text-slate-100 line-clamp-1">
              {citation.path.split("/").pop()}
            </h3>

            {requirementTitle && (
              <p className="text-xs text-slate-400 line-clamp-1">
                Supports: <span className="text-slate-300 font-medium">"{requirementTitle}"</span>
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
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {lineRangeText}
              </span>
            )}

            <div className="flex items-center gap-1.5">
              <GitCommit className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-300" title={`Full SHA: ${citation.commitSha}`}>
                {shortSha}
              </span>
            </div>
          </div>

          {/* GitHub Deep Link */}
          <a
            href={citation.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 border border-emerald-500/30 transition text-xs font-medium"
          >
            <span>View on GitHub</span>
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
              <span className="text-slate-400 font-semibold block flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Verified Claim
              </span>
              <p>{citation.supports}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="italic">
            Lines pinned to commit snapshot <code className="text-slate-300">{shortSha}</code>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
