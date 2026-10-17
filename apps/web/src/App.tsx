import { useState, useEffect, useRef } from "react";
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
import { PredictiveArc } from "./components/PredictiveArc.tsx";
import { TactileButton } from "./components/TactileButton.tsx";
import { getApiUrl } from "./config/api.ts";
import { extractRequirementsFromText, runAssessmentAnalysis, fetchReportById } from "./services/api.ts";

export default function App() {
  const abortControllerRef = useRef<AbortController | null>(null);
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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
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

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { report: resultReport, viewToken: token } = await runAssessmentAnalysis({
        title: "Technical Capability Assessment",
        repositoryUrl: repoUrl.trim(),
        requirements,
        signal: controller.signal,
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
      if (err.name === "AbortError" || controller.signal.aborted) {
        return;
      }
      setAnalysisError(err.message || "Failed to complete capability analysis.");
    } finally {
      abortControllerRef.current = null;
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
    <div className="relative min-h-screen bg-[#030303] text-zinc-100 flex flex-col w-full selection:bg-red-500/30 selection:text-red-200">
      {/* Predictive Arc Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-95">
        <PredictiveArc
          background="#030303"
          baseColor="#FF0000"
          accentColor="#FF9898"
          highlight="#FF0000"
        />
      </div>

      <div className="relative z-10 flex flex-col flex-1 w-full">
        <Header apiStatus={apiStatus} />

        <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/40 border border-red-500/30 text-rose-300 text-xs font-mono uppercase tracking-wider backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              OriginKit Predictive Arc Engine
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-rose-200 bg-clip-text text-transparent">
              Developer Capability Assessment
            </h1>
            <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto">
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
                  className="text-xs text-zinc-400 hover:text-rose-400 transition"
                >
                  &larr; Back to Brief Input
                </button>
                <span className="text-xs font-mono text-rose-400">Target Repo: {repoUrl}</span>
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
                if (abortControllerRef.current) {
                  abortControllerRef.current.abort();
                  abortControllerRef.current = null;
                }
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
              if (selectedCategory !== "all") {
                const req = requirements.find((r) => r.id === item.requirementId);
                if (req && req.category && req.category.toLowerCase() !== selectedCategory.toLowerCase()) {
                  return false;
                }
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
                <div className="flex items-center gap-2 border-b border-red-950/60 pb-2 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveResultsTab("map")}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                      activeResultsTab === "map"
                        ? "bg-red-950/60 border border-red-500/50 text-rose-200 shadow-[0_0_15px_rgba(255,0,0,0.15)]"
                        : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                    }`}
                  >
                    Evidence Map ({report.assessments.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveResultsTab("gaps")}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                      activeResultsTab === "gaps"
                        ? "bg-red-950/60 border border-red-500/50 text-rose-200 shadow-[0_0_15px_rgba(255,0,0,0.15)]"
                        : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                    }`}
                  >
                    Gap Plan & Actions ({report.coverageSummary.partiallyDemonstrated + report.coverageSummary.notDemonstrated + report.coverageSummary.needsReview})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveResultsTab("proposal")}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                      activeResultsTab === "proposal"
                        ? "bg-red-950/60 border border-red-500/50 text-rose-200 shadow-[0_0_15px_rgba(255,0,0,0.15)]"
                        : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                    }`}
                  >
                    Proposal Response Kit
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveResultsTab("export")}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                      activeResultsTab === "export"
                        ? "bg-red-950/60 border border-red-500/50 text-rose-200 shadow-[0_0_15px_rgba(255,0,0,0.15)]"
                        : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                    }`}
                  >
                    Export & Share
                  </button>

                  <div className="ml-auto flex items-center gap-2">
                    <TactileButton
                      onClick={() => setStage("review_requirements")}
                      variant="secondary"
                      size="sm"
                      rounded={14}
                    >
                      Refine Requirements
                    </TactileButton>
                    <TactileButton
                      onClick={() => {
                        setStage("input");
                        setReport(null);
                      }}
                      variant="secondary"
                      size="sm"
                      rounded={14}
                    >
                      New Assessment
                    </TactileButton>
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

        <footer className="border-t border-red-950/40 py-6 text-center text-xs text-zinc-500 backdrop-blur-md bg-black/40">
          Parakh &copy; 2026 Parakh Contributors &bull; Predictive Arc Visual Architecture &bull; Apache-2.0
        </footer>
      </div>
    </div>
  );
}
