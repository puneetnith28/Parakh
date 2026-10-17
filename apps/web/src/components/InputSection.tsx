import { Code, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { DemoLoader } from "./DemoLoader.tsx";

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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
      <DemoLoader onLoadDemo={handleLoadDemo} />

      {validationError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3">
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
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="repoUrl" className="block text-sm font-medium text-slate-200">
          Public GitHub Repository URL
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Code className="w-5 h-5" />
          </div>
          <input
            id="repoUrl"
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onAnalyze}
          disabled={isLoading}
          className="inline-flex items-center px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold text-sm transition shadow-lg shadow-emerald-500/20"
        >
          <Search className="w-4 h-4 mr-2" />
          {isLoading ? "Validating & Connecting..." : "Analyze Capability"}
        </button>
      </div>
    </div>
  );
}
