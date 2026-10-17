import { useState, useEffect } from "react";
import { Requirement, AssessmentReport } from "@parakh/contracts";
import { Header } from "./components/Header.tsx";
import { InputSection } from "./components/InputSection.tsx";
import { RequirementsEditor } from "./components/RequirementsEditor.tsx";
import { getApiUrl } from "./config/api.ts";
import { extractRequirementsFromText, runAssessmentAnalysis } from "./services/api.ts";

export default function App() {
  const [opportunityText, setOpportunityText] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Requirements stage state
  const [stage, setStage] = useState<"input" | "review_requirements" | "analyzing" | "results">("input");
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState<string>("");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [report, setReport] = useState<AssessmentReport | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkApi() {
      try {
        const res = await fetch(getApiUrl("/healthz"));
        if (res.ok && isMounted) {
          setApiStatus("online");
        } else if (isMounted) {
          setApiStatus("offline");
        }
      } catch {
        if (isMounted) setApiStatus("offline");
      }
    }
    checkApi();
    const interval = setInterval(checkApi, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleAnalyze = async () => {
    setValidationError(null);
    setSuccessMessage(null);

    if (!opportunityText.trim()) {
      setValidationError("Please paste a client opportunity brief or RFP description.");
      return;
    }

    if (!repoUrl.trim()) {
      setValidationError("Please provide a valid GitHub repository URL.");
      return;
    }

    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/i;
    if (!githubRegex.test(repoUrl.trim())) {
      setValidationError("Invalid repository URL. Must be in the format: https://github.com/owner/repo");
      return;
    }

    setIsLoading(true);
    try {
      const result = await extractRequirementsFromText(opportunityText, "Opportunity Brief");
      setRequirements(result.requirements);
      setStage("review_requirements");
      const mockNotice = result.isMock ? " (Mock Engine)" : "";
      setSuccessMessage(`Extracted ${result.requirements.length} structured requirements${mockNotice}! Review and refine them below.`);
    } catch (err: any) {
      setValidationError(err.message || "Failed to process opportunity brief.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmRequirements = async () => {
    if (requirements.length === 0) {
      setValidationError("At least one requirement must be approved for analysis.");
      return;
    }
    setStage("analyzing");
    setAnalysisError(null);
    setAnalysisStatus("Connecting to repository and resolving commit snapshot...");

    try {
      const resultReport = await runAssessmentAnalysis({
        title: "Technical Capability Assessment",
        repositoryUrl: repoUrl.trim(),
        requirements,
      });
      setReport(resultReport);
      setStage("results");
    } catch (err: any) {
      setAnalysisError(err.message || "Failed to complete capability analysis.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col w-full">
      <Header apiStatus={apiStatus} />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Developer Capability Assessment
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Extract requirements from your client brief and verify them against inspectable code, tests, and documentation from your GitHub repository.
          </p>
        </div>

        {stage === "input" && (
          <InputSection
            opportunityText={opportunityText}
            setOpportunityText={setOpportunityText}
            repoUrl={repoUrl}
            setRepoUrl={setRepoUrl}
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            validationError={validationError}
            successMessage={successMessage}
          />
        )}

        {stage === "review_requirements" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStage("input")}
                className="text-xs text-slate-400 hover:text-slate-200 transition"
              >
                &larr; Back to Brief Input
              </button>
              <span className="text-xs font-mono text-emerald-400">Target Repo: {repoUrl}</span>
            </div>

            <RequirementsEditor
              requirements={requirements}
              onChange={setRequirements}
              onConfirm={handleConfirmRequirements}
            />
          </div>
        )}

        {stage === "analyzing" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center space-y-6 max-w-xl mx-auto shadow-2xl">
            {analysisError ? (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 text-xl font-bold">
                  !
                </div>
                <h3 className="text-xl font-bold text-white">Analysis Interrupted</h3>
                <p className="text-sm text-rose-300 bg-rose-950/40 border border-rose-800/40 rounded-xl p-3 text-left">
                  {analysisError}
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmRequirements}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition"
                  >
                    Retry Analysis
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAnalysisError(null);
                      setStage("review_requirements");
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition"
                  >
                    Back to Requirements
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Analyzing Repository Evidence</h3>
                  <p className="text-sm text-slate-400 font-mono">Target: {repoUrl}</p>
                  <p className="text-xs text-emerald-400 mt-2">{analysisStatus}</p>
                </div>
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>{requirements.length} requirements verified</span>
                  <button
                    type="button"
                    onClick={() => setStage("review_requirements")}
                    className="text-slate-400 hover:text-slate-200 transition underline"
                  >
                    Cancel & Review
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {stage === "results" && report && (
          <div className="space-y-8">
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6">
              <div>
                <h2 className="text-lg font-bold text-white">{report.opportunityTitle || "Capability Assessment Report"}</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Repo: {report.repositoryUrl} | Commit: {report.resolvedCommitSha?.slice(0, 7)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStage("review_requirements")}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Refine Requirements
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        Parakh &copy; 2026 Parakh Contributors. Open-source under Apache-2.0.
      </footer>
    </div>
  );
}
