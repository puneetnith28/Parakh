import { Code, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { DemoLoader } from "./DemoLoader.tsx";
import { TactileButton } from "./TactileButton.tsx";

interface InputSectionProps {
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
    <div className="bg-neutral-950/75 border border-red-950/40 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
      <DemoLoader onLoadDemo={handleLoadDemo} />

      {validationError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <span>{validationError}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="opportunity" className="block text-sm font-medium text-slate-200">
          Client Opportunity Brief / RFP / Job Description
        </label>
        <textarea
          id="opportunity"
          rows={6}
          value={opportunityText}
          onChange={(e) => setOpportunityText(e.target.value)}
          placeholder="Paste technical requirements, project scope, or client brief here..."
          className="w-full bg-black/60 border border-neutral-800 rounded-xl p-4 text-sm text-slate-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="repoUrl" className="block text-sm font-medium text-slate-200">
          Public GitHub Repository URL
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
            <Code className="w-5 h-5" />
          </div>
          <input
            id="repoUrl"
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            className="w-full bg-black/60 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
          />
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <TactileButton
          onClick={onAnalyze}
          disabled={isLoading}
          variant="primary"
          size="md"
          rounded={20}
        >
          <Search className="w-4 h-4 mr-2 inline" />
          {isLoading ? "Validating & Connecting..." : "Analyze Capability"}
        </TactileButton>
      </div>
    </div>
  );
}
