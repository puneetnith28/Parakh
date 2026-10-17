import { useState, useEffect } from "react";
import { Requirement, AssessmentReport, Citation, RequirementAssessment } from "@parakh/contracts";
import { Header } from "./components/Header.tsx";
import { InputSection } from "./components/InputSection.tsx";
import { RequirementsEditor } from "./components/RequirementsEditor.tsx";
import { AnalysisProgress } from "./components/AnalysisProgress.tsx";
import { EvidenceMap } from "./components/EvidenceMap/EvidenceMap.tsx";
import { CoverageSummary } from "./components/EvidenceMap/CoverageSummary.tsx";
import { FilterBar, type FilterStatus } from "./components/EvidenceMap/FilterBar.tsx";
import { EvidenceDrawer } from "./components/EvidenceMap/EvidenceDrawer.tsx";
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

  // Results filtering & citation state
  const [selectedCitation, setSelectedCitation] = useState<{
    citation: Citation;
    assessment: RequirementAssessment;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

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
          <AnalysisProgress
            repoUrl={repoUrl}
            requirementsCount={requirements.length}
            statusMessage={analysisStatus}
            error={analysisError}
            onRetry={handleConfirmRequirements}
            onCancel={() => {
              setAnalysisError(null);
              setStage("review_requirements");
            }}
            onChangeTarget={() => {
              setAnalysisError(null);
              setStage("input");
            }}
          />
        )}

        {stage === "results" && report && (() => {
          const filteredAssessments = (report.assessments || []).filter((item) => {
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              const match =
                item.requirementText.toLowerCase().includes(q) ||
                item.rationale.toLowerCase().includes(q) ||
                item.requirementId.toLowerCase().includes(q);
              if (!match) return false;
            }
            if (statusFilter === "gaps_only") {
              if (item.status === "demonstrated") return false;
            } else if (statusFilter !== "all") {
              if (item.status !== statusFilter) return false;
            }
            return true;
          });

          return (
            <div className="space-y-8">
              {/* Executive Header Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      Assessment Verified
                    </span>
                    <span className="text-xs text-slate-500 font-mono">ID: {report.id}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {report.opportunityTitle || "Capability Assessment Report"}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono flex-wrap">
                    <span>
                      Repo:{" "}
                      <a
                        href={report.repositoryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline"
                      >
                        {report.repositoryUrl.replace(/^https?:\/\/github\.com\//, "")}
                      </a>
                    </span>
                    <span>SHA: <span className="text-slate-300">{report.resolvedCommitSha?.slice(0, 7)}</span></span>
                    <span>Files Scanned: <span className="text-slate-300">{report.scannedFilesCount}</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStage("review_requirements")}
                    className="text-xs font-medium px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    Edit Requirements
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStage("input");
                      setReport(null);
                    }}
                    className="text-xs font-medium px-3.5 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                  >
                    New Analysis
                  </button>
                </div>
              </div>

              {/* Coverage Summary Counters */}
              <CoverageSummary summary={report.coverageSummary} />

              {/* Interactive Filter Bar */}
              <FilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                counts={{
                  total: report.coverageSummary.total,
                  demonstrated: report.coverageSummary.demonstrated,
                  partially_demonstrated: report.coverageSummary.partiallyDemonstrated,
                  not_demonstrated: report.coverageSummary.notDemonstrated,
                  needs_review: report.coverageSummary.needsReview,
                }}
              />

              {/* Evidence Map */}
              <EvidenceMap
                assessments={filteredAssessments}
                onSelectCitation={(citation, assessment) => {
                  setSelectedCitation({ citation, assessment });
                }}
              />

              {/* Citation Inspection Drawer */}
              {selectedCitation && (
                <EvidenceDrawer
                  isOpen={!!selectedCitation}
                  onClose={() => setSelectedCitation(null)}
                  citation={selectedCitation.citation}
                  requirementTitle={selectedCitation.assessment.requirementText}
                />
              )}
            </div>
          );
        })()}
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        Parakh &copy; 2026 Parakh Contributors. Open-source under Apache-2.0.
      </footer>
    </div>
  );
}
