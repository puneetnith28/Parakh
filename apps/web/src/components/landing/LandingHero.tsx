import React from 'react';
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, GitCommit } from 'lucide-react';
import { Button } from '../ui/Button';

export interface LandingHeroProps {
  onStartAssessment?: () => void;
  onExploreDemo?: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onStartAssessment,
  onExploreDemo,
}) => {
  return (
    <section className="relative overflow-hidden bg-white pt-12 pb-20 sm:pt-16 sm:pb-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Subtle pill tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F2F4F0] border border-[#E2E5DE] mb-6">
          <span className="w-2 h-2 rounded-full bg-[#163300] animate-pulse" />
          <span className="text-xs font-semibold text-[#163300] tracking-wide uppercase">
            Evidence-Grounded Repository Intelligence
          </span>
        </div>

        {/* Reference 1 Bold Compact Uppercase Headline */}
        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-[80px] text-[#111111] leading-[0.95] tracking-[-0.04em] uppercase mx-auto max-w-4xl">
          EVIDENCE FOR CODE, CLAIMS AND CAPABILITY
        </h1>

        {/* Clear Subtitle */}
        <p className="mt-6 sm:mt-8 text-base sm:text-xl text-[#5F625E] font-medium leading-relaxed max-w-2xl mx-auto">
          Evaluate how convincingly GitHub repositories demonstrate opportunity brief requirements with traceable code citations, commit pinning, and transparent uncertainty.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={onStartAssessment}
            icon={<ArrowRight className="w-5 h-5" />}
            iconPosition="right"
            className="shadow-sm font-bold text-base px-8 py-4"
          >
            Start Assessment
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={onExploreDemo}
            className="font-semibold text-base px-7 py-4"
          >
            Explore Live Demo
          </Button>
        </div>

        {/* Reference 1 3D Floating Globe/Orb Artwork with Orbiting Tokens */}
        <div className="mt-12 sm:mt-16 relative flex items-center justify-center">
          <div className="relative w-72 h-72 sm:w-96 sm:h-96 flex items-center justify-center">
            {/* Soft Ambient Glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#9FE870]/30 via-emerald-100/40 to-sky-100/30 blur-2xl transform -rotate-12 scale-90" />

            {/* Central 3D Faceted Crystal Sphere */}
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full shadow-2xl flex items-center justify-center overflow-hidden border border-white/50 bg-gradient-to-tr from-[#163300] via-[#245305] to-[#9FE870]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/40 via-transparent to-black/30" />
              {/* Internal Holographic Facets */}
              <div className="relative z-10 flex flex-col items-center justify-center text-white text-center p-4">
                <ShieldCheck className="w-16 h-16 sm:w-20 sm:h-20 text-[#9FE870] drop-shadow-md" />
                <span className="font-display text-sm sm:text-base tracking-wider mt-2 text-white/90">
                  VERIFIED TRACE
                </span>
                <span className="text-[11px] font-mono text-[#9FE870] mt-0.5">
                  100% Deterministic Proof
                </span>
              </div>
            </div>

            {/* Orbiting Satellite 1: Commit Pin Badge */}
            <div className="absolute top-4 left-0 sm:left-4 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-[#E2E5DE] flex items-center gap-2.5 animate-bounce [animation-duration:3s]">
              <div className="w-8 h-8 rounded-full bg-[#163300] text-[#9FE870] flex items-center justify-center font-bold">
                <GitCommit className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-[#111111]">Pinned Commit</div>
                <div className="text-[10px] font-mono text-[#5F625E]">sha:848ce1d</div>
              </div>
            </div>

            {/* Orbiting Satellite 2: Citation Node */}
            <div className="absolute bottom-6 right-0 sm:right-6 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-[#E2E5DE] flex items-center gap-2.5 animate-bounce [animation-duration:3.5s] [animation-delay:0.5s]">
              <div className="w-8 h-8 rounded-full bg-[#9FE870] text-[#163300] flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-[#111111]">Citation Grounded</div>
                <div className="text-[10px] font-mono text-[#5F625E]">Line 124–158 ✓</div>
              </div>
            </div>

            {/* Orbiting Satellite 3: AI Uncertainty Token */}
            <div className="absolute -bottom-2 left-6 sm:left-12 bg-white/95 backdrop-blur-md rounded-full px-3.5 py-1.5 shadow-md border border-[#E2E5DE] flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#163300]" />
              <span className="text-xs font-semibold text-[#111111]">Calibrated Confidence</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
