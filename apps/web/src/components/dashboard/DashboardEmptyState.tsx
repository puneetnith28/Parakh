import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

export interface DashboardEmptyStateProps {
  onStartAssessment: () => void;
  onExploreDemo?: () => void;
}

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({
  onStartAssessment,
  onExploreDemo,
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[60vh] max-w-xl mx-auto text-center px-4 py-12">
      {/* Radial Grid Backdrop */}
      <div className="absolute inset-0 bg-grid-dots mask-radial pointer-events-none opacity-60" />
      {/* Reference 2: 3D Iridescent Origami Paper Airplane */}
      <div className="relative w-48 h-48 sm:w-60 sm:h-60 mb-8 flex items-center justify-center">
        {/* Soft background ambient glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-pink-300/30 via-purple-300/20 to-cyan-300/30 rounded-full blur-2xl transform scale-75" />

        <svg
          viewBox="0 0 240 240"
          className="w-full h-full drop-shadow-2xl transform -rotate-12 hover:rotate-0 transition-transform duration-500 ease-out"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="planeWingLeft" x1="20" y1="120" x2="200" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#D946EF" />
              <stop offset="50%" stopColor="#EC4899" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>
            <linearGradient id="planeWingRight" x1="120" y1="100" x2="220" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            <linearGradient id="planeCenterFold" x1="40" y1="130" x2="160" y2="170" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#9333EA" />
              <stop offset="100%" stopColor="#BE185D" />
            </linearGradient>
            <linearGradient id="planeUnderside" x1="80" y1="140" x2="170" y2="190" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4C1D95" />
              <stop offset="100%" stopColor="#1E1B4B" />
            </linearGradient>
          </defs>

          {/* Origami Underside Shadow facet */}
          <polygon points="120,135 160,195 180,150" fill="url(#planeUnderside)" opacity="0.9" />

          {/* Left Wing Facet */}
          <polygon points="25,120 215,35 125,135" fill="url(#planeWingLeft)" />

          {/* Right Wing Facet */}
          <polygon points="215,35 125,135 200,115" fill="url(#planeWingRight)" />

          {/* Origami Center Keel / Fold */}
          <polygon points="125,135 150,185 215,35" fill="url(#planeCenterFold)" opacity="0.95" />

          {/* Dynamic Highlight Edge */}
          <line x1="25" y1="120" x2="215" y2="35" stroke="white" strokeWidth="2" strokeOpacity="0.6" />
          <line x1="215" y1="35" x2="150" y2="185" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
        </svg>
      </div>

      {/* Reference 2: Bold Compact Uppercase Headline */}
      <h2 className="font-display text-3xl sm:text-5xl text-[#111111] uppercase tracking-[-0.035em] leading-[0.98]">
        LET&apos;S EVALUATE YOUR FIRST REPO
      </h2>

      {/* Reference 2: Clean Subtitle */}
      <p className="mt-4 text-sm sm:text-base text-[#5F625E] leading-relaxed max-w-md">
        Evaluate how convincingly code demonstrates opportunity brief requirements. No ungrounded assumptions, no hallucinated citations.
      </p>

      {/* Reference 2: Centered Bright Lime Pill Button */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={onStartAssessment}
          icon={<ArrowRight className="w-4 h-4" />}
          iconPosition="right"
          className="font-bold text-base px-8 py-3.5 shadow-sm"
        >
          Start an assessment
        </Button>

        {onExploreDemo && (
          <Button
            variant="secondary"
            size="lg"
            onClick={onExploreDemo}
            icon={<Sparkles className="w-4 h-4 text-[#163300]" />}
            className="text-sm font-bold px-7 py-3.5 shadow-sm"
          >
            Load Sample Audit
          </Button>
        )}
      </div>
    </div>
  );
};

export default DashboardEmptyState;
