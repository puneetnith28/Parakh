import { GitBranch, Search, AlertCircle, CheckCircle2, FileText, Shield } from 'lucide-react';
import { DemoLoader } from './DemoLoader';
import { Button } from './ui/Button';

export interface InputSectionProps {
  opportunityText: string;
  setOpportunityText: (text: string) => void;
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  validationError: string | null;
  successMessage: string | null;
}

export function InputSection({
  opportunityText,
  setOpportunityText,
  repoUrl,
  setRepoUrl,
  onAnalyze,
  isLoading,
  validationError,
  successMessage,
}: InputSectionProps) {
  const handleLoadDemo = (brief: string, repo: string) => {
    setOpportunityText(brief);
    setRepoUrl(repo);
  };

  return (
    <div className="bg-[#F2F4F0] border border-[#E2E5DE] rounded-[28px] p-6 sm:p-10 shadow-sm space-y-8">
      {/* Header / Intro inside card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E5DE]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
            Assessment Scope & Target
          </h2>
          <p className="text-xs sm:text-sm text-[#5F625E] mt-1">
            Provide the technical opportunity brief and the public GitHub repository to evaluate.
          </p>
        </div>

        {/* Quick Demo Pre-loader */}
        <div className="shrink-0">
          <DemoLoader onLoadDemo={handleLoadDemo} />
        </div>
      </div>

      {/* Validation Feedback */}
      {validationError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-medium">{validationError}</span>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-[#9FE870]/25 border border-[#9FE870]/60 text-[#163300] text-sm flex items-start gap-3"
        >
          <CheckCircle2 className="w-5 h-5 text-[#163300] shrink-0 mt-0.5" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* 1. Opportunity Brief Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="opportunity" className="block text-sm font-bold text-[#111111]">
            Client Opportunity Brief / RFP / Assignment Specification
          </label>
          <span className="text-xs text-[#5F625E] font-medium flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> Markdown / Text
          </span>
        </div>
        <textarea
          id="opportunity"
          rows={6}
          value={opportunityText}
          onChange={(e) => setOpportunityText(e.target.value)}
          placeholder="Paste technical requirements, project deliverables, security constraints, or engineering test criteria..."
          className="w-full bg-white border border-[#E2E5DE] rounded-2xl p-4 text-sm text-[#111111] placeholder-[#828580] focus:outline-none focus:ring-2 focus:ring-[#163300] focus:border-[#163300] transition shadow-sm leading-relaxed"
        />
      </div>

      {/* 2. GitHub Repository Target URL */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="repoUrl" className="block text-sm font-bold text-[#111111]">
            Public GitHub Repository URL
          </label>
          <span className="text-xs font-mono text-[#163300] bg-[#9FE870]/30 px-2.5 py-0.5 rounded-full border border-[#9FE870]/60 font-semibold flex items-center gap-1">
            <Shield className="w-3 h-3" /> SSRF Protected
          </span>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#5F625E]">
            <GitBranch className="w-5 h-5" />
          </div>
          <input
            id="repoUrl"
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            className="w-full bg-white border border-[#E2E5DE] rounded-2xl pl-12 pr-4 py-3.5 text-sm font-mono text-[#111111] placeholder-[#828580] focus:outline-none focus:ring-2 focus:ring-[#163300] focus:border-[#163300] transition shadow-sm"
          />
        </div>
        <p className="text-xs text-[#5F625E]">
          Target repository HEAD will be resolved and pinned to an immutable commit SHA.
        </p>
      </div>

      {/* Action Row */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E2E5DE]">
        <div className="text-xs text-[#5F625E]">
          Includes AST parsing, citation mapping, and uncertainty calibration.
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={onAnalyze}
          disabled={isLoading || !opportunityText.trim() || !repoUrl.trim()}
          isLoading={isLoading}
          icon={<Search className="w-4 h-4" />}
          className="font-bold text-sm px-8 py-3.5 shadow-sm w-full sm:w-auto"
        >
          {isLoading ? 'Inspecting & Analyzing...' : 'Analyze Capability'}
        </Button>
      </div>
    </div>
  );
}

export default InputSection;
