import { useState, useEffect } from "react";
import { Requirement, AssessmentReport, Citation, RequirementAssessment } from "@parakh/contracts";
import { Header } from "./components/Header.tsx";
import { InputSection } from "./components/InputSection.tsx";
import { RequirementsEditor } from "./components/RequirementsEditor.tsx";
import { AnalysisProgress } from "./components/AnalysisProgress.tsx";
import { EvidenceMap } from "./components/EvidenceMap/EvidenceMap.tsx";
import { CoverageSummary } from "./components/EvidenceMap/CoverageSummary.tsx";
import { FilterBar, type FilterStatus } from "./components/EvidenceMap/FilterBar.tsx";
import { CitationDrawer } from "./components/EvidenceMap/CitationDrawer.tsx";
import { ReportSummary } from "./components/ReportSummary.tsx";
import { GapChecklist } from "./components/GapChecklist.tsx";
import { ProposalKit } from "./components/ProposalKit.tsx";
import { ReportExport } from "./components/ReportExport.tsx";
import { getApiUrl } from "./config/api.ts";
import { extractRequirementsFromText, runAssessmentAnalysis, fetchReportById } from "./services/api.ts";

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
  const [viewToken, setViewToken] = useState<string | null>(null);

  // Results filtering & citation state
  const [selectedCitation, setSelectedCitation] = useState<{
    citation: Citation;
    assessment: RequirementAssessment;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeResultsTab, setActiveResultsTab] = useState<"map" | "gaps" | "proposal" | "export">("map");

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

    // Deep linking: load persisted report if reportId and token are present in URL
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get("reportId");
    const token = params.get("token");
    if (reportId && token) {
      setIsLoading(true);
      fetchReportById(reportId, token)
        .then(({ report: loadedReport, viewToken: loadedToken }) => {
          if (isMounted) {
            setReport(loadedReport);
            setViewToken(loadedToken);
            setStage("results");
            setSuccessMessage("Persisted assessment report loaded successfully via secure token.");
          }
        })
        .catch((err: any) => {
          if (isMounted) {
            setValidationError(err.message || "Failed to load shared report.");
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }

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
      const { report: resultReport, viewToken: token } = await runAssessmentAnalysis({
        title: "Technical Capability Assessment",
        repositoryUrl: repoUrl.trim(),
        requirements,
      });
      setReport(resultReport);
      if (token) {
        setViewToken(token);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("reportId", resultReport.id);
        newUrl.searchParams.set("token", token);
        window.history.replaceState({}, "", newUrl.toString());
      }
      setStage("results");
    } catch (err: any) {
      setAnalysisError(err.message || "Failed to complete capability analysis.");
    }
  };

  const handleReportDeleted = () => {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete("reportId");
    newUrl.searchParams.delete("token");
    window.history.replaceState({}, "", newUrl.toString());
    setReport(null);
    setViewToken(null);
    setStage("input");
    setSuccessMessage("Report has been permanently deleted.");
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
              {/* Executive Report Summary */}
              <ReportSummary
                report={report}
                onExportPrint={() => window.print()}
                onExportJson={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
                  const downloadAnchor = document.createElement("a");
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", `parakh-assessment-${report.id}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }}
              />

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveResultsTab("map")}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                    activeResultsTab === "map"
                      ? "bg-slate-800 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Evidence Map ({report.assessments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultsTab("gaps")}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                    activeResultsTab === "gaps"
                      ? "bg-slate-800 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Gap Plan & Actions ({report.coverageSummary.partiallyDemonstrated + report.coverageSummary.notDemonstrated + report.coverageSummary.needsReview})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultsTab("proposal")}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                    activeResultsTab === "proposal"
                      ? "bg-slate-800 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Proposal Response Kit
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultsTab("export")}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                    activeResultsTab === "export"
                      ? "bg-slate-800 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Export & Share
                </button>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStage("review_requirements")}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition whitespace-nowrap"
                  >
                    Refine Requirements
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStage("input");
                      setReport(null);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition whitespace-nowrap"
                  >
                    New Assessment
                  </button>
                </div>
              </div>

              {/* Tab 1: Interactive Evidence Map */}
              {activeResultsTab === "map" && (
                <div className="space-y-6">
                  <CoverageSummary summary={report.coverageSummary} />
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

                  <EvidenceMap
                    assessments={filteredAssessments}
                    onSelectCitation={(citation, assessment) => {
                      setSelectedCitation({ citation, assessment });
                    }}
                  />
                </div>
              )}

              {/* Tab 2: Gap Plan & Action Checklist */}
              {activeResultsTab === "gaps" && (
                <GapChecklist assessments={report.assessments} />
              )}

              {/* Tab 3: Proposal Response Kit */}
              {activeResultsTab === "proposal" && (
                <ProposalKit
                  assessments={report.assessments}
                  repositoryUrl={report.repositoryUrl}
                  opportunityTitle={report.opportunityTitle}
                />
              )}

              {/* Tab 4: Export Center */}
              {activeResultsTab === "export" && (
                <ReportExport
                  report={report}
                  viewToken={viewToken}
                  onDelete={handleReportDeleted}
                />
              )}

              {/* Citation Inspection Drawer */}
              {selectedCitation && (
                <CitationDrawer
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
