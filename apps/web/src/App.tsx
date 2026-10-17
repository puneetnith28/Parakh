import { useState, useEffect, useRef } from 'react';
import { Requirement, AssessmentReport, Citation, RequirementAssessment } from '@parakh/contracts';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './components/landing/LandingPage';
import { DashboardShell, DashboardNavTab } from './components/dashboard/DashboardShell';
import { DashboardEmptyState } from './components/dashboard/DashboardEmptyState';
import { DashboardAssessmentList, AssessmentSummaryItem } from './components/dashboard/DashboardAssessmentList';
import { EvaluationModeModal, EvaluationMode } from './components/onboarding/EvaluationModeModal';
import { InputSection } from './components/InputSection';
import { RequirementsEditor } from './components/RequirementsEditor';
import { AnalysisProgress } from './components/AnalysisProgress';
import { EvidenceMap } from './components/EvidenceMap/EvidenceMap';
import { CitationDrawer } from './components/EvidenceMap/CitationDrawer';
import { ReportSummary } from './components/ReportSummary';
import { GapChecklist } from './components/GapChecklist';
import { ProposalKit } from './components/ProposalKit';
import { ReportExport } from './components/ReportExport';
import { getApiUrl } from './config/api';
import { extractRequirementsFromText, runAssessmentAnalysis, fetchReportById } from './services/api';
import { ArrowLeft } from 'lucide-react';
import { Button } from './components/ui/Button';

export default function App() {
  const abortControllerRef = useRef<AbortController | null>(null);

  // View state
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'assessment'>('landing');
  const [dashboardTab, setDashboardTab] = useState<DashboardNavTab>('home');
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);

  // Form input state
  const [opportunityText, setOpportunityText] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Assessment pipeline stage state
  const [stage, setStage] = useState<'input' | 'review_requirements' | 'analyzing' | 'results'>('input');
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [report, setReport] = useState<AssessmentReport | null>(null);
  const [viewToken, setViewToken] = useState<string | null>(null);

  // Results filtering & citation state
  const [selectedCitation, setSelectedCitation] = useState<{
    citation: Citation;
    assessment: RequirementAssessment;
  } | null>(null);
  const [activeResultsTab, setActiveResultsTab] = useState<'map' | 'gaps' | 'proposal' | 'export'>('map');

  // Stored recent assessments list
  const [recentAssessments, setRecentAssessments] = useState<AssessmentSummaryItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function checkApi() {
      try {
        const res = await fetch(getApiUrl('/healthz'));
        if (res.ok && isMounted) {
          setApiStatus('online');
        } else if (isMounted) {
          setApiStatus('offline');
        }
      } catch {
        if (isMounted) setApiStatus('offline');
      }
    }
    checkApi();
    const interval = setInterval(checkApi, 15000);

    // Deep linking: load persisted report if reportId and token are present in URL
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get('reportId');
    const token = params.get('token');
    if (reportId && token) {
      setIsLoading(true);
      fetchReportById(reportId, token)
        .then(({ report: loadedReport, viewToken: loadedToken }) => {
          if (isMounted) {
            setReport(loadedReport);
            setViewToken(loadedToken);
            setStage('results');
            setCurrentView('dashboard');
            setDashboardTab('assessments');
            setSuccessMessage('Persisted assessment report loaded successfully via secure token.');
          }
        })
        .catch((err: any) => {
          if (isMounted) {
            setValidationError(err.message || 'Failed to load shared report.');
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

  // Update recent assessments list when a report finishes
  useEffect(() => {
    if (report) {
      const summary: AssessmentSummaryItem = {
        id: report.id,
        opportunityTitle: report.opportunityTitle || 'Technical Capability Assessment',
        repositoryUrl: report.repositoryUrl,
        commitSha: report.resolvedCommitSha,
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        demonstratedCount: report.coverageSummary.demonstrated,
        partiallyDemonstratedCount: report.coverageSummary.partiallyDemonstrated,
        notDemonstratedCount: report.coverageSummary.notDemonstrated,
        needsReviewCount: report.coverageSummary.needsReview,
        totalRequirements: report.coverageSummary.total,
        provenanceVerified: Boolean(report.resolvedCommitSha),
      };
      setRecentAssessments((prev) => {
        const exists = prev.some((a) => a.id === summary.id);
        if (exists) return prev.map((a) => (a.id === summary.id ? summary : a));
        return [summary, ...prev];
      });
    }
  }, [report]);

  const handleStartNewAssessment = () => {
    setValidationError(null);
    setSuccessMessage(null);
    setIsModeModalOpen(true);
  };

  const handleSelectMode = (_mode: EvaluationMode) => {
    setIsModeModalOpen(false);
    setCurrentView('assessment');
    setStage('input');
  };

  const handleAnalyze = async () => {
    setValidationError(null);
    setSuccessMessage(null);

    if (!opportunityText.trim()) {
      setValidationError('Please paste a client opportunity brief or RFP description.');
      return;
    }

    if (!repoUrl.trim()) {
      setValidationError('Please provide a valid GitHub repository URL.');
      return;
    }

    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/i;
    if (!githubRegex.test(repoUrl.trim())) {
      setValidationError('Invalid repository URL. Must be in the format: https://github.com/owner/repo');
      return;
    }

    setIsLoading(true);
    try {
      const result = await extractRequirementsFromText(opportunityText, 'Opportunity Brief');
      setRequirements(result.requirements);
      setStage('review_requirements');
      const mockNotice = result.isMock ? ' (Deterministic Engine)' : '';
      setSuccessMessage(`Extracted ${result.requirements.length} structured requirements${mockNotice}! Review and refine them below.`);
    } catch (err: any) {
      setValidationError(err.message || 'Failed to process opportunity brief.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmRequirements = async () => {
    if (requirements.length === 0) {
      setValidationError('At least one requirement must be approved for analysis.');
      return;
    }
    setStage('analyzing');
    setAnalysisError(null);
    setAnalysisStatus('Connecting to repository and resolving commit snapshot...');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { report: resultReport, viewToken: token } = await runAssessmentAnalysis({
        title: 'Technical Capability Assessment',
        repositoryUrl: repoUrl.trim(),
        requirements,
        signal: controller.signal,
      });
      setReport(resultReport);
      if (token) {
        setViewToken(token);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('reportId', resultReport.id);
        newUrl.searchParams.set('token', token);
        window.history.replaceState({}, '', newUrl.toString());
      }
      setStage('results');
      setCurrentView('dashboard');
      setDashboardTab('assessments');
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      setAnalysisError(err.message || 'Failed to complete capability analysis.');
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleReportDeleted = () => {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('reportId');
    newUrl.searchParams.delete('token');
    window.history.replaceState({}, '', newUrl.toString());
    setReport(null);
    setViewToken(null);
    setStage('input');
    setSuccessMessage('Report has been permanently deleted.');
  };

  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col w-full selection:bg-[#9FE870] selection:text-[#163300]">
      {/* 1. PUBLIC LANDING VIEW (Reference 1) */}
      {currentView === 'landing' && (
        <>
          <Navbar
            apiStatus={apiStatus}
            onStartAssessment={handleStartNewAssessment}
            onNavigateHome={() => setCurrentView('landing')}
            onNavigateDashboard={() => {
              setCurrentView('dashboard');
              setDashboardTab('home');
            }}
            currentView={currentView}
          />
          <LandingPage
            onStartAssessment={handleStartNewAssessment}
            onExploreDemo={() => {
              setCurrentView('assessment');
              setStage('input');
            }}
          />
        </>
      )}

      {/* 2. DASHBOARD VIEW (Reference 2) */}
      {currentView === 'dashboard' && (
        <DashboardShell
          title={
            dashboardTab === 'home'
              ? 'Home'
              : dashboardTab === 'assessments'
              ? 'Assessments'
              : dashboardTab === 'evidence'
              ? 'Evidence Map'
              : 'Action Plan'
          }
          activeTab={dashboardTab}
          onSelectTab={(tab) => {
            if (tab === 'home') {
              setCurrentView('landing');
            } else {
              setDashboardTab(tab);
            }
          }}
          onNewAssessment={handleStartNewAssessment}
          headerRight={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('landing')}
              className="text-xs font-semibold"
            >
              Public Home
            </Button>
          }
        >
          {/* Dashboard Home / Assessments tab */}
          {(dashboardTab === 'home' || dashboardTab === 'assessments') && (
            <>
              {report ? (
                <div className="space-y-8 max-w-5xl mx-auto">
                  {/* Results Sub-Navigation */}
                  <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E5DE] pb-4">
                    <button
                      type="button"
                      onClick={() => setActiveResultsTab('map')}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        activeResultsTab === 'map'
                          ? 'bg-[#163300] text-white shadow-sm'
                          : 'bg-[#F2F4F0] text-[#5F625E] hover:text-[#111111]'
                      }`}
                    >
                      Report & Evidence Map
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveResultsTab('gaps')}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        activeResultsTab === 'gaps'
                          ? 'bg-[#163300] text-white shadow-sm'
                          : 'bg-[#F2F4F0] text-[#5F625E] hover:text-[#111111]'
                      }`}
                    >
                      Gap Checklist
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveResultsTab('proposal')}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        activeResultsTab === 'proposal'
                          ? 'bg-[#163300] text-white shadow-sm'
                          : 'bg-[#F2F4F0] text-[#5F625E] hover:text-[#111111]'
                      }`}
                    >
                      Proposal Kit
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveResultsTab('export')}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        activeResultsTab === 'export'
                          ? 'bg-[#163300] text-white shadow-sm'
                          : 'bg-[#F2F4F0] text-[#5F625E] hover:text-[#111111]'
                      }`}
                    >
                      Export Center
                    </button>
                  </div>

                  {/* Active Sub-tab View */}
                  {activeResultsTab === 'map' && (
                    <div className="space-y-8">
                      <ReportSummary report={report} />
                      <EvidenceMap
                        assessments={report.assessments}
                        onSelectCitation={(citation, assessment) => {
                          setSelectedCitation({ citation, assessment });
                        }}
                      />
                    </div>
                  )}

                  {activeResultsTab === 'gaps' && (
                    <div className="bg-[#F2F4F0] p-6 sm:p-10 rounded-[28px] border border-[#E2E5DE]">
                      <h3 className="text-xl font-bold text-[#111111] mb-2">Technical Gap Checklist</h3>
                      <p className="text-xs text-[#5F625E] mb-6">
                        Concrete remediation steps for requirements not fully demonstrated.
                      </p>
                      <GapChecklist assessments={report.assessments} />
                    </div>
                  )}

                  {activeResultsTab === 'proposal' && (
                    <div className="bg-[#F2F4F0] p-6 sm:p-10 rounded-[28px] border border-[#E2E5DE]">
                      <h3 className="text-xl font-bold text-[#111111] mb-2">Proposal & Client Response Kit</h3>
                      <p className="text-xs text-[#5F625E] mb-6">
                        Auto-generated draft response emphasizing proven architectural strengths.
                      </p>
                      <ProposalKit
                        assessments={report.assessments}
                        repositoryUrl={report.repositoryUrl}
                        opportunityTitle={report.opportunityTitle}
                      />
                    </div>
                  )}

                  {activeResultsTab === 'export' && (
                    <ReportExport
                      report={report}
                      viewToken={viewToken}
                      onDelete={handleReportDeleted}
                    />
                  )}
                </div>
              ) : recentAssessments.length > 0 ? (
                <DashboardAssessmentList
                  assessments={recentAssessments}
                  onSelectAssessment={() => {}}
                  onNewAssessment={handleStartNewAssessment}
                />
              ) : (
                /* Reference 2 Centered Empty State with 3D Origami Airplane */
                <DashboardEmptyState
                  onStartAssessment={handleStartNewAssessment}
                  onExploreDemo={() => {
                    setCurrentView('assessment');
                    setStage('input');
                  }}
                />
              )}
            </>
          )}

          {/* Evidence Map Dedicated View */}
          {dashboardTab === 'evidence' && (
            <div className="max-w-5xl mx-auto space-y-6">
              {report ? (
                <EvidenceMap
                  assessments={report.assessments}
                  onSelectCitation={(citation, assessment) => {
                    setSelectedCitation({ citation, assessment });
                  }}
                />
              ) : (
                <div className="text-center py-20 bg-[#F2F4F0] rounded-[28px] border border-[#E2E5DE]">
                  <p className="text-[#5F625E] text-sm mb-4">
                    No active evidence map. Run an assessment to generate code citations.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleStartNewAssessment}
                    className="font-bold text-xs"
                  >
                    Start an Assessment
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Action Plan Dedicated View */}
          {dashboardTab === 'action-plan' && (
            <div className="max-w-5xl mx-auto space-y-6">
              {report ? (
                <div className="space-y-6">
                  <div className="bg-[#F2F4F0] p-6 sm:p-10 rounded-[28px] border border-[#E2E5DE]">
                    <h3 className="text-xl font-bold text-[#111111] mb-2">Remediation Action Plan</h3>
                    <GapChecklist assessments={report.assessments} />
                  </div>
                  <div className="bg-[#F2F4F0] p-6 sm:p-10 rounded-[28px] border border-[#E2E5DE]">
                    <h3 className="text-xl font-bold text-[#111111] mb-2">Client Response Kit</h3>
                    <ProposalKit
                      assessments={report.assessments}
                      repositoryUrl={report.repositoryUrl}
                      opportunityTitle={report.opportunityTitle}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 bg-[#F2F4F0] rounded-[28px] border border-[#E2E5DE]">
                  <p className="text-[#5F625E] text-sm mb-4">
                    No action plan available. Run an assessment to generate gap closures.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleStartNewAssessment}
                    className="font-bold text-xs"
                  >
                    Start an Assessment
                  </Button>
                </div>
              )}
            </div>
          )}
        </DashboardShell>
      )}

      {/* 3. ASSESSMENT SETUP WORKFLOW */}
      {currentView === 'assessment' && (
        <div className="min-h-screen bg-white flex flex-col">
          <header className="border-b border-[#E2E5DE] py-4 px-6 flex items-center justify-between sticky top-0 bg-white z-40">
            <button
              type="button"
              onClick={() => setCurrentView('dashboard')}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#163300] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <div className="font-display text-xl text-[#111111]">
              PARAKH<span className="text-[#9FE870] font-black">.</span>
            </div>
            <div className="text-xs font-mono text-[#5F625E]">
              API: <span className="text-[#163300] font-bold uppercase">{apiStatus}</span>
            </div>
          </header>

          <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full space-y-8">
            {stage === 'input' && (
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

            {stage === 'review_requirements' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStage('input')}
                    className="text-xs font-bold text-[#163300] hover:underline transition flex items-center gap-1"
                  >
                    &larr; Edit Brief & Repository Target
                  </button>
                  <span className="text-xs font-mono text-[#5F625E]">
                    Target: <strong className="text-[#111111]">{repoUrl}</strong>
                  </span>
                </div>

                <RequirementsEditor
                  requirements={requirements}
                  onChange={setRequirements}
                  onConfirm={handleConfirmRequirements}
                />
              </div>
            )}

            {stage === 'analyzing' && (
              <AnalysisProgress
                repoUrl={repoUrl}
                requirementsCount={requirements.length}
                statusMessage={analysisStatus}
                error={analysisError}
                onRetry={handleConfirmRequirements}
                onCancel={() => setStage('review_requirements')}
                onChangeTarget={() => setStage('input')}
              />
            )}
          </main>
        </div>
      )}

      {/* Reference 3: Evaluation Mode Selection Modal */}
      <EvaluationModeModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        onSelectMode={handleSelectMode}
      />

      {/* Citation Inspector Drawer */}
      <CitationDrawer
        isOpen={Boolean(selectedCitation)}
        citation={selectedCitation ? selectedCitation.citation : null}
        requirementTitle={selectedCitation?.assessment.requirementText}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
}
