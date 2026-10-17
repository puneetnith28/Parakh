import { useState } from "react";
import { Copy, Check, Edit3, Eye, Sparkles, CheckCircle2 } from "lucide-react";
import { RequirementAssessment } from "@parakh/contracts";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
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
  
  // Clean initial text of disclaimer duplicates and excessive asterisks for better editing
  const cleanInitialText = initialDraft.fullDraftText
    .replace(/^\[ADVISORY DISCLAIMER:[^\]]+\]\s*/i, "")
    .replace(/\*{3,}/g, "**");

  const [draftContent, setDraftContent] = useState(cleanInitialText);

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
    <div className={`bg-white border border-[#E2E5DE] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 font-sans ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E5DE]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="lime" size="sm">Evidence Grounded</Badge>
            <span className="text-xs text-[#5F625E]">Auto-generated client response draft</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
            Proposal & Client Response Kit
          </h3>
          <p className="text-xs sm:text-sm text-[#5F625E]">
            Professional client draft tailored directly from verified repository commits and test suites.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant="outline"
            size="sm"
            icon={isEditing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            className="font-semibold text-xs bg-white shadow-xs"
          >
            {isEditing ? "Preview Mode" : "Edit Draft"}
          </Button>

          <Button
            onClick={handleCopy}
            variant="primary"
            size="sm"
            icon={copied ? <Check className="w-4 h-4 text-[#9FE870]" /> : <Copy className="w-4 h-4" />}
            className="font-bold text-xs shadow-xs"
          >
            {copied ? "Copied to Clipboard" : "Copy Draft"}
          </Button>
        </div>
      </div>

      {/* Subtle Informational Tip (Replaces clunky warning banner) */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F2F4F0] border border-[#E2E5DE] text-xs text-[#5F625E]">
        <span className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Only verified skills are affirmed; gaps are transparently framed as collaborative discussion points.</span>
        </span>
        <span className="font-mono text-[11px] text-[#163300] font-bold shrink-0 hidden md:inline">
          Ready to export
        </span>
      </div>

      {/* Editor / Text Preview */}
      {isEditing ? (
        <textarea
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          rows={16}
          aria-label="Edit Proposal Draft"
          className="w-full bg-white border border-[#E2E5DE] text-[#111111] text-sm font-sans rounded-2xl p-5 focus:outline-none focus:ring-2 focus:ring-[#163300] focus:border-[#163300] transition leading-relaxed shadow-xs"
        />
      ) : (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#F8F9F7] border border-[#E2E5DE] text-sm text-[#111111] font-sans leading-relaxed whitespace-pre-line shadow-xs">
          {draftContent}
        </div>
      )}

      {/* Grounding Status Summary */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5F625E] pt-2 border-t border-[#E2E5DE]">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#163300]">
            <Sparkles className="w-4 h-4 text-[#163300]" />
            {initialDraft.demonstratedCapabilities.length} verified capabilities cited
          </span>
          <span className="text-[#CBD0C5]">•</span>
          <span>
            {initialDraft.collaborationTopics.length} discussion inquiries framed
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#828580]">
          Verified against commit SHA: {repositoryUrl.split("/").pop()}
        </span>
      </div>
    </div>
  );
}

export default ResponseDraft;
