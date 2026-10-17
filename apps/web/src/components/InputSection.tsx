import {
  GitBranch,
  Search,
  AlertCircle,
  CheckCircle2,
  FileText,
  Shield,
  Sparkles,
  SlidersHorizontal,
  ArrowRightLeft,
  Check,
  Code2,
  Lock,
  Boxes,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { EvaluationMode } from './onboarding/EvaluationModeModal';
import { SAMPLE_BRIEF_TEXT, SAMPLE_REPO_URL } from './DemoLoader';

export interface InputSectionProps {
  evaluationMode: EvaluationMode;
  onSwitchMode?: (mode: EvaluationMode) => void;
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
  evaluationMode,
  onSwitchMode,
  opportunityText,
  setOpportunityText,
  repoUrl,
  setRepoUrl,
  onAnalyze,
  isLoading,
  validationError,
  successMessage,
}: InputSectionProps) {
  const isDirectAudit = evaluationMode === 'quick-audit';

  const handleLoadDemo = () => {
    setOpportunityText(SAMPLE_BRIEF_TEXT);
    setRepoUrl(SAMPLE_REPO_URL);
  };

  const sampleRepos = [
    { label: 'Parakh (Self Audit)', url: 'https://github.com/puneetnith28/Parakh' },
    { label: 'Express.js', url: 'https://github.com/expressjs/express' },
    { label: 'Fastify', url: 'https://github.com/fastify/fastify' },
  ];

  return (
    <div className="w-full space-y-8 font-sans">
      {/* Top Header Row with Clear Hierarchy & Uncluttered Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E2E5DE]">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2.5">
            <Badge variant={isDirectAudit ? 'dark' : 'lime'} size="sm">
              {isDirectAudit ? 'Direct Repo Audit' : 'Opportunity Brief & RFP'}
            </Badge>
            <span className="text-xs text-[#5F625E]">
              {isDirectAudit ? 'No external brief required' : 'Verified evidence alignment'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111111]">
            {isDirectAudit
              ? 'Repository Architecture & Security Audit'
              : 'Client Opportunity Brief & RFP Assessment'}
          </h1>

          <p className="text-sm sm:text-base text-[#5F625E] leading-relaxed">
            {isDirectAudit
              ? 'Automated direct audit of codebase architecture patterns, test coverage, and security posture without needing an external brief.'
              : 'Deconstruct opportunity briefs or job specifications into verifiable requirements, then cross-reference with GitHub repository code citations.'}
          </p>
        </div>

        {/* Clean Top Action Toolbar */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 self-start lg:self-center">
          {!isDirectAudit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadDemo}
              icon={<Sparkles className="w-3.5 h-3.5 text-[#163300]" />}
              className="font-semibold text-xs bg-white shadow-xs"
            >
              Pre-fill Demo Brief
            </Button>
          )}

          <button
            type="button"
            onClick={() => onSwitchMode?.(isDirectAudit ? 'opportunity' : 'quick-audit')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#163300] bg-white hover:bg-[#F2F4F0] border border-[#E2E5DE] px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{isDirectAudit ? 'Switch to Brief / RFP' : 'Switch to Direct Audit'}</span>
          </button>
        </div>
      </div>

      {/* Alert / Validation Feedback */}
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

      {/* Main Responsive Grid Layout */}
      {!isDirectAudit ? (
        /* Opportunity Assessment: 12-Column Responsive Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Spacious Opportunity Brief Textarea (8 Columns on desktop) */}
          <div className="lg:col-span-7 xl:col-span-8 bg-[#F2F4F0] border border-[#E2E5DE] rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#111111]">
                  Opportunity Brief / Assignment Specification
                </h3>
                <p className="text-xs text-[#5F625E] mt-0.5">
                  Paste client RFP text, job description requirements, or technical criteria.
                </p>
              </div>
              <span className="text-xs text-[#5F625E] font-medium hidden sm:flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-[#E2E5DE]">
                <FileText className="w-3.5 h-3.5" /> Markdown / Text
              </span>
            </div>

            <textarea
              id="opportunity"
              rows={16}
              value={opportunityText}
              onChange={(e) => setOpportunityText(e.target.value)}
              placeholder="Paste technical requirements, project deliverables, security constraints, or engineering test criteria..."
              className="w-full min-h-[380px] lg:min-h-[460px] bg-white border border-[#E2E5DE] rounded-2xl p-5 text-sm text-[#111111] placeholder-[#828580] focus:outline-none focus:ring-2 focus:ring-[#163300] focus:border-[#163300] transition shadow-xs leading-relaxed resize-y font-sans"
            />

            <div className="flex items-center justify-between text-xs text-[#5F625E] pt-1">
              <span>{opportunityText.length > 0 ? `${opportunityText.split(/\s+/).filter(Boolean).length} words` : 'Awaiting brief input'}</span>
              <span>Deconstructed via Gemini-3.8-Flash schema</span>
            </div>
          </div>

          {/* Right Column: Target Repository & Execution Controls (4 Columns on desktop) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            {/* Target Repository Card */}
            <div className="bg-[#F2F4F0] border border-[#E2E5DE] rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">
                  Target Repository
                </h3>
                <span className="text-[11px] font-mono text-[#163300] bg-[#9FE870]/30 px-2.5 py-0.5 rounded-full border border-[#9FE870]/60 font-semibold flex items-center gap-1">
                  <Shield className="w-3 h-3" /> SSRF Protected
                </span>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5F625E]">
                  <GitBranch className="w-4 h-4" />
                </div>
                <input
                  id="repoUrl"
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  className="w-full bg-white border border-[#E2E5DE] rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm font-mono text-[#111111] placeholder-[#828580] focus:outline-none focus:ring-2 focus:ring-[#163300] focus:border-[#163300] transition shadow-xs"
                />
              </div>

              {/* Quick sample chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-[#5F625E] font-medium">Quick sample targets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {sampleRepos.map((repo) => (
                    <button
                      key={repo.url}
                      type="button"
                      onClick={() => setRepoUrl(repo.url)}
                      className="text-[11px] font-mono text-[#163300] bg-white border border-[#E2E5DE] hover:border-[#163300] px-2.5 py-1 rounded-xl transition cursor-pointer"
                    >
                      {repo.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-[#5F625E] leading-relaxed pt-1 border-t border-[#E2E5DE]">
                Target repository HEAD is automatically resolved and pinned to an immutable commit SHA.
              </p>
            </div>

            {/* Evidence Engine Assurance Card */}
            <div className="bg-white border border-[#E2E5DE] rounded-3xl p-6 space-y-3 shadow-xs">
              <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                Evidence Engine Assurances
              </h4>
              <ul className="space-y-2.5 text-xs text-[#5F625E]">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>AST syntax tree decomposition & interface mapping</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>100% deterministic GitHub line citations with commit pinning</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Transparent uncertainty calibration (Demonstrated vs Needs Review)</span>
                </li>
              </ul>
            </div>

            {/* Primary Action Button */}
            <div className="space-y-2">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={onAnalyze}
                disabled={isLoading || !opportunityText.trim() || !repoUrl.trim()}
                isLoading={isLoading}
                icon={<Search className="w-4 h-4" />}
                className="font-bold text-sm py-4 shadow-sm"
              >
                {isLoading ? 'Inspecting & Analyzing...' : 'Extract & Analyze Capability'}
              </Button>
              <p className="text-center text-[11px] text-[#5F625E]">
                Read-only evaluation • No source code stored
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Direct Repository Audit: Clean Wide 2-Column Responsive Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Repository Target Input & Launch (5 Columns on desktop) */}
          <div className="lg:col-span-5 bg-[#F2F4F0] border border-[#E2E5DE] rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-[#111111]">
                  Target Repository to Audit
                </h3>
                <span className="text-[11px] font-mono text-[#163300] bg-[#9FE870]/30 px-2.5 py-0.5 rounded-full border border-[#9FE870]/60 font-semibold flex items-center gap-1">
                  <Shield className="w-3 h-3" /> SSRF Protected
                </span>
              </div>
              <p className="text-xs text-[#5F625E]">
                Provide any public or private GitHub repository to evaluate immediately.
              </p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5F625E]">
                  <GitBranch className="w-4 h-4" />
                </div>
                <input
                  id="repoUrl"
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  className="w-full bg-white border border-[#E2E5DE] rounded-2xl pl-10 pr-4 py-3.5 text-sm font-mono text-[#111111] placeholder-[#828580] focus:outline-none focus:ring-2 focus:ring-[#163300] focus:border-[#163300] transition shadow-xs"
                />
              </div>

              {/* Sample Targets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-[#5F625E] font-medium">Quick sample targets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {sampleRepos.map((repo) => (
                    <button
                      key={repo.url}
                      type="button"
                      onClick={() => setRepoUrl(repo.url)}
                      className="text-xs font-mono text-[#163300] bg-white border border-[#E2E5DE] hover:border-[#163300] px-3 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      {repo.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E5DE] space-y-3">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={onAnalyze}
                disabled={isLoading || !repoUrl.trim()}
                isLoading={isLoading}
                icon={<Sparkles className="w-4 h-4" />}
                className="font-bold text-sm py-4 shadow-sm"
              >
                {isLoading ? 'Inspecting & Analyzing...' : 'Run Repository Audit'}
              </Button>
              <p className="text-center text-[11px] text-[#5F625E]">
                Resolves commit HEAD • Generates cryptographic HMAC audit seal
              </p>
            </div>
          </div>

          {/* Right Column: Pre-Calibrated Audit Dimensions (7 Columns on desktop) */}
          <div className="lg:col-span-7 bg-[#F2F4F0] border border-[#E2E5DE] rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E5DE]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#163300]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
                  Pre-Calibrated Audit Scope (4 Pillars)
                </h3>
              </div>
              <Badge variant="lime" size="sm">Standard Rubric</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="bg-white p-4 rounded-2xl border border-[#E2E5DE] space-y-1 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-xs text-[#111111]">
                  <Boxes className="w-4 h-4 text-[#163300]" />
                  <span>Architecture & Modularity</span>
                </div>
                <p className="text-[11px] text-[#5F625E] leading-relaxed">
                  Clean separation of concerns, modular directory organization, domain layering, and decoupled dependencies.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#E2E5DE] space-y-1 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-xs text-[#111111]">
                  <Code2 className="w-4 h-4 text-[#163300]" />
                  <span>Automated Testing Rigor</span>
                </div>
                <p className="text-[11px] text-[#5F625E] leading-relaxed">
                  Unit and integration test suites with passing assertions, mock fixtures, and edge-case verification.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#E2E5DE] space-y-1 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-xs text-[#111111]">
                  <Lock className="w-4 h-4 text-[#163300]" />
                  <span>Security & Defensive Coding</span>
                </div>
                <p className="text-[11px] text-[#5F625E] leading-relaxed">
                  SSRF protection, strict input sanitization, authentication/authorization checks, and safe secrets management.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#E2E5DE] space-y-1 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-xs text-[#111111]">
                  <CheckCircle2 className="w-4 h-4 text-[#163300]" />
                  <span>API Contracts & Resilience</span>
                </div>
                <p className="text-[11px] text-[#5F625E] leading-relaxed">
                  Strict schema validation, typed API responses, deterministic status codes, and resilient error recovery.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-[#5F625E]">
              <span>Deterministic AST analysis • Zero prompt hallucination</span>
              <span className="font-mono text-[#163300] font-bold">gemini-3.8-flash engine</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InputSection;
