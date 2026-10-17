import React from 'react';
import {
  ArrowRight,
  ShieldCheck,
  FileSearch,
  Lock,
  GitBranch,
  ExternalLink,
  Terminal,
} from 'lucide-react';
import { LandingHero } from './LandingHero';
import { HowItWorksSteps } from './HowItWorksSteps';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

export interface LandingPageProps {
  onStartAssessment?: () => void;
  onExploreDemo?: () => void;
  onOpenReport?: (id: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartAssessment,
  onExploreDemo,
}) => {
  return (
    <div className="w-full bg-white flex flex-col">
      {/* 1. Hero Section (White background) */}
      <LandingHero
        onStartAssessment={onStartAssessment}
        onExploreDemo={onExploreDemo}
      />

      {/* 2. White Section: Interactive Animated Evaluation Steps */}
      <section id="how-it-works" className="py-20 bg-white border-t border-[#E2E5DE] relative overflow-hidden scroll-mt-20">
        {/* Background Architectural Grid */}
        <div className="absolute inset-0 bg-grid-subtle mask-radial pointer-events-none opacity-60" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <HowItWorksSteps onStartAssessment={onStartAssessment} />
        </div>
      </section>

      {/* 3. Reference 1 Vibrant Lime Section (#9FE870) */}
      <section className="py-20 sm:py-28 bg-[#9FE870] text-[#163300] relative overflow-hidden">
        {/* Background Architectural Grid */}
        <div className="absolute inset-0 bg-grid-lime mask-radial pointer-events-none opacity-60" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl sm:text-5xl text-[#163300] uppercase tracking-tight leading-tight">
                SAVE HOURS PINNING COMMITS AND AUDITING CODE
              </h2>
              <p className="mt-6 text-base sm:text-lg text-[#163300]/80 font-medium leading-relaxed">
                Never accept speculative claims without verifiable repo evidence. Parakh resolves HEAD to immutable commit SHAs, validates repositories against SSRF attacks, and indexes code AST chunks in seconds.
              </p>
            </div>

            {/* Inspection Metrics Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 text-[#111111] shadow-xl border border-black/5">
              <div className="flex items-center justify-between pb-4 border-b border-[#E2E5DE]">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-[#163300]" />
                  <span className="font-mono text-sm font-bold">puneetnith28/Parakh</span>
                </div>
                <Badge variant="dark" size="sm">PINNED</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="bg-[#F2F4F0] p-4 rounded-2xl">
                  <div className="text-2xl font-bold font-display text-[#163300]">150</div>
                  <div className="text-xs text-[#5F625E] font-medium mt-1">Files Scanned</div>
                </div>
                <div className="bg-[#F2F4F0] p-4 rounded-2xl">
                  <div className="text-2xl font-bold font-display text-[#163300]">100%</div>
                  <div className="text-xs text-[#5F625E] font-medium mt-1">Evidence Grounded</div>
                </div>
                <div className="bg-[#F2F4F0] p-4 rounded-2xl">
                  <div className="text-2xl font-bold font-display text-[#163300]">0</div>
                  <div className="text-xs text-[#5F625E] font-medium mt-1">Ungrounded Claims</div>
                </div>
                <div className="bg-[#F2F4F0] p-4 rounded-2xl">
                  <div className="text-2xl font-bold font-display text-[#163300]">SHA-256</div>
                  <div className="text-xs text-[#5F625E] font-medium mt-1">Provenance Hash</div>
                </div>
              </div>

              <div className="text-xs font-mono text-[#5F625E] bg-[#F2F4F0] p-3 rounded-xl flex items-center justify-between">
                <span>commit: 848ce1d9f01bb431b643724a...</span>
                <span className="text-[#163300] font-bold">VERIFIED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Light Gray Section: Precise Citation Inspection */}
      <section id="evidence-grounding" className="py-20 bg-[#F2F4F0] relative overflow-hidden scroll-mt-20">
        {/* Background Architectural Grid */}
        <div className="absolute inset-0 bg-grid-surface mask-radial pointer-events-none opacity-70" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5F625E] bg-white px-3.5 py-1.5 rounded-full border border-[#E2E5DE]">
              Deterministic Traceability
            </span>
            <h2 className="font-display text-3xl sm:text-5xl text-[#111111] uppercase tracking-tight mt-4">
              THE CITATION THAT ALWAYS FINDS THE EXACT CODE
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#5F625E]">
              Every assessment claim links directly to immutable GitHub repository line numbers and commit hashes.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E2E5DE] shadow-sm max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E2E5DE]">
              <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-[#163300]" />
                <span className="font-mono text-xs sm:text-sm font-semibold text-[#111111]">
                  apps/api/src/services/provenance.ts#L48-L62
                </span>
              </div>
              <Badge variant="success" size="sm" dot>Demonstrated</Badge>
            </div>

            {/* Code Snippet Box */}
            <div className="mt-6 bg-[#163300] text-emerald-100 p-6 rounded-2xl font-mono text-xs sm:text-sm overflow-x-auto leading-relaxed shadow-inner">
              <div className="text-white/60 mb-2">// Pinned commit 848ce1d — Canonical HMAC-SHA256 signature generation</div>
              <div className="text-white"><span className="text-[#9FE870]">export function</span> generateReportProvenanceHash(canonicalJson: string): string {'{'}</div>
              <div className="pl-4 text-emerald-300">const hash = crypto.createHash('sha256');</div>
              <div className="pl-4 text-emerald-300">hash.update(canonicalJson, 'utf8');</div>
              <div className="pl-4 text-emerald-300">return hash.digest('hex');</div>
              <div className="text-white">{'}'}</div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-[#5F625E]">
              <span>Verified against immutable commit tree</span>
              <a
                href="https://github.com/puneetnith28/Parakh"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[#163300] font-bold hover:underline"
              >
                Inspect on GitHub <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Reference 1 Deep Forest Green Section (#163300) */}
      <section className="py-20 sm:py-28 bg-[#163300] text-white relative overflow-hidden">
        {/* Background Architectural Grid */}
        <div className="absolute inset-0 bg-grid-dark mask-radial pointer-events-none opacity-40" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="font-display text-3xl sm:text-5xl text-[#9FE870] uppercase tracking-tight leading-tight">
              MEET CODE EVALUATION WITHOUT BLIND SPOTS
            </h2>
            <p className="mt-6 text-base sm:text-lg text-white/80 leading-relaxed font-normal">
              Transparent uncertainty calibration: whenever evidence is insufficient or ambiguous, Parakh explicitly marks requirements as <strong className="text-[#9FE870]">Needs Review</strong> with gap recommendations rather than fabricating false certainty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
            <Card variant="white" className="p-6">
              <div className="w-10 h-10 rounded-full bg-[#9FE870]/30 text-[#163300] flex items-center justify-center font-bold mb-4">
                ✓
              </div>
              <h3 className="font-bold text-lg text-[#111111]">Demonstrated</h3>
              <p className="mt-2 text-sm text-[#5F625E]">
                Direct, unambiguous evidence with matching implementations and tests in the repository.
              </p>
            </Card>

            <Card variant="white" className="p-6">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-4">
                ~
              </div>
              <h3 className="font-bold text-lg text-[#111111]">Partially Demonstrated</h3>
              <p className="mt-2 text-sm text-[#5F625E]">
                Foundational architecture present but edge cases, tests, or complete specifications are missing.
              </p>
            </Card>

            <Card variant="white" className="p-6">
              <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-bold mb-4">
                ?
              </div>
              <h3 className="font-bold text-lg text-[#111111]">Needs Review</h3>
              <p className="mt-2 text-sm text-[#5F625E]">
                Heuristic ambiguity identified; requires human inspection without false negative penalties.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 6. Security and Trust Section (White) */}
      <section className="py-20 bg-white relative overflow-hidden">
        {/* Background Architectural Grid */}
        <div className="absolute inset-0 bg-grid-subtle mask-radial pointer-events-none opacity-60" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5F625E] bg-[#F2F4F0] px-3.5 py-1.5 rounded-full">
              Enterprise Defense
            </span>
            <h2 className="font-display text-3xl sm:text-5xl text-[#111111] uppercase tracking-tight mt-4">
              DISAPPOINT FALSE CLAIMS & CODE TAMPERING
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#5F625E]">
              Zero-trust architecture protecting repository evaluation from fabrication, SSRF, and credential disclosure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-3xl bg-[#F2F4F0] border border-[#E2E5DE]">
              <div className="w-12 h-12 rounded-2xl bg-[#163300] text-[#9FE870] flex items-center justify-center mb-6">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#111111]">Provenance Integrity</h3>
              <p className="mt-2 text-sm text-[#5F625E] leading-relaxed">
                Every exported report contains a cryptographic HMAC-SHA256 hash. Any byte tampered with post-run fails verification instantly.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#F2F4F0] border border-[#E2E5DE]">
              <div className="w-12 h-12 rounded-2xl bg-[#163300] text-[#9FE870] flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#111111]">SSRF Defense</h3>
              <p className="mt-2 text-sm text-[#5F625E] leading-relaxed">
                Strict URL normalization, IPv4/IPv6 loopback rejection, cloud instance metadata blocking, and port filtering on every repo target.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#F2F4F0] border border-[#E2E5DE]">
              <div className="w-12 h-12 rounded-2xl bg-[#163300] text-[#9FE870] flex items-center justify-center mb-6">
                <FileSearch className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#111111]">Transparent Model Status</h3>
              <p className="mt-2 text-sm text-[#5F625E] leading-relaxed">
                Clear distinction between live LLM analysis and deterministic heuristic fallback. Never mistakes a mock for live evaluation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Bottom CTA Section (Surface Gray #ECEFEA) */}
      <section className="py-20 bg-[#ECEFEA] border-t border-[#E2E5DE] relative overflow-hidden">
        {/* Background Architectural Grid */}
        <div className="absolute inset-0 bg-grid-subtle mask-radial pointer-events-none opacity-50" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl sm:text-5xl text-[#111111] uppercase tracking-tight">
            START EVALUATING REPOSITORIES TODAY
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5F625E] max-w-xl mx-auto">
            Get instant, verifiable assessments with traceable citations and automated gap closure plans.
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={onStartAssessment}
              icon={<ArrowRight className="w-5 h-5" />}
              iconPosition="right"
              className="font-bold text-base px-9 py-4 shadow-md"
            >
              Start Free Assessment
            </Button>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-8 bg-white border-t border-[#E2E5DE] text-xs text-[#5F625E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#111111]">Parakh</span>
            <span>—</span>
            <span>Evidence-Grounded Developer Capability Assessment</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/puneetnith28/Parakh"
              target="_blank"
              rel="noreferrer"
              className="text-[#163300] font-bold hover:underline"
            >
              GitHub Repository
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
