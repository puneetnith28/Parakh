import React, { useEffect } from 'react';
import { X, ExternalLink, GitCommit, FileCode, CheckCircle2, ShieldCheck, Copy, Check } from 'lucide-react';
import { Citation } from '@parakh/contracts';
import { CodeSnippet } from '../CodeSnippet';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

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
  if (!base || !base.startsWith('http')) {
    const cleanRepo = (citation.repository || 'owner/repo').replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
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
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !citation) return null;

  const shortSha = citation.commitSha ? citation.commitSha.slice(0, 7) : 'unknown';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-white border border-[#E2E5DE] rounded-[28px] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#E2E5DE] bg-white gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="lime" size="sm" dot dotColor="bg-[#163300]">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#163300]" />
                Verified Grounding
              </Badge>
              <span className="text-xs font-mono text-[#5F625E]">ID: {citation.candidateId}</span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#F2F4F0] text-[#111111] capitalize font-medium">
                {citation.evidenceType || 'source'} evidence
              </span>
            </div>

            <h3 className="text-lg font-bold text-[#111111] line-clamp-1">
              {citation.path.split('/').pop()}
            </h3>

            {requirementTitle && (
              <p className="text-xs text-[#5F625E] line-clamp-1">
                Supports: <span className="text-[#111111] font-semibold">&ldquo;{requirementTitle}&rdquo;</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#5F625E] hover:text-[#111111] hover:bg-[#F2F4F0] transition-colors"
            title="Close drawer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata Strip */}
        <div className="px-6 py-3.5 bg-[#F2F4F0] border-b border-[#E2E5DE] flex items-center justify-between gap-3 flex-wrap text-xs font-mono">
          <div className="flex items-center gap-4 flex-wrap text-[#5F625E]">
            <div className="flex items-center gap-1.5 text-[#111111]">
              <FileCode className="w-4 h-4 text-[#163300]" />
              <span className="font-bold truncate max-w-xs">{citation.path}</span>
            </div>

            {lineRangeText && (
              <span className="px-2.5 py-0.5 rounded-full bg-white text-[#163300] font-bold border border-[#E2E5DE]">
                {lineRangeText}
              </span>
            )}

            <button
              type="button"
              onClick={handleCopySha}
              title={`Copy commit SHA: ${citation.commitSha}`}
              className="flex items-center gap-1.5 text-[#5F625E] hover:text-[#111111] transition-colors group"
            >
              <GitCommit className="w-3.5 h-3.5 text-[#163300]" />
              <span className="font-bold">{shortSha}</span>
              {copiedSha ? <Check className="w-3.5 h-3.5 text-[#163300]" /> : <Copy className="w-3 h-3 text-[#828580]" />}
            </button>
          </div>

          {/* GitHub Commit Permalink */}
          <a
            href={permalinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#163300] hover:bg-[#9FE870]/30 border border-[#E2E5DE] font-bold text-xs transition-colors"
          >
            <span>Inspect on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Code Content */}
        <div className="p-6 overflow-y-auto space-y-4 max-h-[50vh]">
          <CodeSnippet
            code={citation.snippet}
            startLine={citation.startLine || 1}
          />

          {citation.supports && (
            <div className="p-4 rounded-2xl bg-[#F2F4F0] border border-[#E2E5DE] text-xs text-[#111111] space-y-1">
              <span className="text-[#163300] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified Substantive Content
              </span>
              <p className="text-[#5F625E] leading-relaxed">{citation.supports}</p>
            </div>
          )}

          {citation.limitations && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold">Scope Limitations</span>
              <p>{citation.limitations}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-[#E2E5DE] flex items-center justify-between text-xs text-[#5F625E]">
          <span className="italic truncate max-w-sm">
            Immutable snapshot pinned to <code className="font-bold text-[#111111]">{shortSha}</code>
          </span>
          <Button
            onClick={onClose}
            variant="secondary"
            size="sm"
            className="font-bold text-xs"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CitationDrawer;
