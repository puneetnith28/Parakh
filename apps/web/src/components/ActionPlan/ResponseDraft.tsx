import { useState } from "react";
import { FileText, Copy, Check, AlertTriangle, Edit3, Sparkles } from "lucide-react";
import { RequirementAssessment } from "@parakh/contracts";
import { TactileButton } from "../TactileButton.tsx";
import { generateProposalDraft } from "@parakh/assessment";

interface ResponseDraftProps {
  assessments: RequirementAssessment[];
  repositoryUrl: string;
  opportunityTitle?: string;
  className?: string;
}

export function ResponseDraft({
  assessments,
  repositoryUrl,
  opportunityTitle = "Client Opportunity Brief",
  className = "",
}: ResponseDraftProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const initialDraft = generateProposalDraft(assessments, repositoryUrl, opportunityTitle);
  const [draftContent, setDraftContent] = useState(initialDraft.fullDraftText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className={`p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Grounded Proposal Response Draft</h3>
            <p className="text-xs text-slate-400">
              Only verified capabilities are claimed; gaps are framed honestly as discovery topics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TactileButton
            onClick={() => setIsEditing(!isEditing)}
            variant="secondary"
            size="sm"
            rounded={14}
          >
            <Edit3 className="w-3.5 h-3.5 mr-1.5 inline" />
            <span>{isEditing ? "View Clean Mode" : "Edit Draft"}</span>
          </TactileButton>

          <TactileButton
            onClick={handleCopy}
            variant="primary"
            size="sm"
            rounded={14}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 inline text-emerald-400" />
                <span>Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5 inline" />
                <span>Copy Draft</span>
              </>
            )}
          </TactileButton>
        </div>
      </div>

      {/* Mandatory Honesty & Review Disclaimer Banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold block text-amber-200">Mandatory Review Flag:</span>
          <p className="text-amber-300/90 leading-relaxed">
            This response draft was assembled from verified repository commits. Ensure you review and customize all phrasing before sending to a prospective client.
          </p>
        </div>
      </div>

      {/* Editor / Text Preview */}
      {isEditing ? (
        <textarea
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          rows={14}
          className="w-full bg-slate-950/90 border border-slate-800 text-slate-200 text-xs sm:text-sm font-mono rounded-xl p-4 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
        />
      ) : (
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs sm:text-sm text-slate-300 font-sans leading-relaxed whitespace-pre-line max-h-[380px] overflow-y-auto">
          {draftContent}
        </div>
      )}

      {/* Grounding Status Summary */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
        <span className="inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          {initialDraft.demonstratedCapabilities.length} proven skills cited directly
        </span>
        <span>
          {initialDraft.collaborationTopics.length} discussion inquiries framed
        </span>
      </div>
    </div>
  );
}
