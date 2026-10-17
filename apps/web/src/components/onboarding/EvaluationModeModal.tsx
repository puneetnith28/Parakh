import React, { useState } from 'react';
import { ArrowLeft, X, ExternalLink } from 'lucide-react';
import { SelectionCard } from '../ui/SelectionCard';

export type EvaluationMode = 'opportunity' | 'quick-audit';

export interface EvaluationModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: EvaluationMode) => void;
  initialMode?: EvaluationMode;
}

export const EvaluationModeModal: React.FC<EvaluationModeModalProps> = ({
  isOpen,
  onClose,
  onSelectMode,
  initialMode = 'opportunity',
}) => {
  const [selected, setSelected] = useState<EvaluationMode>(initialMode);

  if (!isOpen) return null;

  const handleSelect = (mode: EvaluationMode) => {
    setSelected(mode);
    onSelectMode(mode);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evaluation-mode-heading"
      className="fixed inset-0 z-50 overflow-y-auto bg-white flex flex-col min-h-screen"
    >
      {/* Top Header Row matching Reference 3 */}
      <header className="w-full border-b border-[#E2E5DE] bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl tracking-tight text-[#111111]">
              PARAKH
            </span>
            <span className="w-2 h-2 rounded-full bg-[#9FE870] mb-1" />
          </div>

          {/* Reference 3 Top Multi-Step Progress Tracker */}
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold">
            <div className="flex flex-col items-center">
              <span className="text-[#5F625E]">Brief Input</span>
              <div className="w-16 h-1 bg-[#9FE870] rounded-full mt-1.5" />
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[#111111] font-bold">Evaluation Mode</span>
              <div className="w-16 h-1 bg-[#163300] rounded-full mt-1.5" />
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[#828580]">Target Repo</span>
              <div className="w-16 h-1 bg-[#E2E5DE] rounded-full mt-1.5" />
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[#828580]">Review</span>
              <div className="w-16 h-1 bg-[#E2E5DE] rounded-full mt-1.5" />
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[#828580]">Evidence Report</span>
              <div className="w-16 h-1 bg-[#E2E5DE] rounded-full mt-1.5" />
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#F2F4F0] text-[#5F625E] hover:text-[#111111] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col justify-between">
        {/* Back Link */}
        <div className="mb-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#163300] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>

        {/* Reference 3 Centered Heading & Subtitle */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <h1
            id="evaluation-mode-heading"
            className="text-2xl sm:text-4xl font-bold text-[#111111] tracking-tight leading-snug"
          >
            What kind of evaluation would you like to run today?
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#5F625E]">
            You can customize assessment criteria, categories, and target repositories later on, too.
          </p>
        </div>

        {/* Reference 3: Two Symmetrical Light-Gray Selection Cards (#F2F4F0) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-3xl mx-auto w-full">
          {/* Card 1: Opportunity Assessment (with 3D crystal house illustration) */}
          <SelectionCard
            id="mode-opportunity"
            title="Opportunity Assessment"
            description="Evaluate code against a full client brief or RFP with verifiable citation mapping."
            selected={selected === 'opportunity'}
            onClick={() => handleSelect('opportunity')}
            icon={
              <svg viewBox="0 0 160 160" className="w-28 h-28 drop-shadow-md" fill="none">
                <defs>
                  <linearGradient id="roofPink" x1="20" y1="20" x2="140" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#EC4899" />
                    <stop offset="50%" stopColor="#D946EF" />
                    <stop offset="100%" stopColor="#A855F7" />
                  </linearGradient>
                  <linearGradient id="wallCyan" x1="30" y1="80" x2="130" y2="150" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="50%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#A855F7" />
                  </linearGradient>
                  <linearGradient id="doorMagenta" x1="60" y1="100" x2="100" y2="150" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#1E1B4B" />
                    <stop offset="100%" stopColor="#4C1D95" />
                  </linearGradient>
                </defs>
                {/* Chimney */}
                <rect x="100" y="30" width="16" height="30" rx="3" fill="#C026D3" />
                {/* Roof Facet */}
                <polygon points="80,25 25,75 135,75" fill="url(#roofPink)" />
                {/* House Base */}
                <rect x="35" y="75" width="90" height="65" rx="4" fill="url(#wallCyan)" />
                {/* Door / Entry */}
                <rect x="68" y="100" width="24" height="40" rx="3" fill="url(#doorMagenta)" />
                {/* Holographic highlight line */}
                <line x1="80" y1="25" x2="135" y2="75" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
              </svg>
            }
          />

          {/* Card 2: Direct Repo Audit (with 3D crystal briefcase illustration) */}
          <SelectionCard
            id="mode-quick-audit"
            title="Repository Audit"
            description="Quickly audit architecture, test coverage, and security posture without an external brief."
            selected={selected === 'quick-audit'}
            onClick={() => handleSelect('quick-audit')}
            icon={
              <svg viewBox="0 0 160 160" className="w-28 h-28 drop-shadow-md" fill="none">
                <defs>
                  <linearGradient id="briefcaseCyan" x1="20" y1="50" x2="140" y2="140" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#06B6D4" />
                    <stop offset="50%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                  <linearGradient id="handleTeal" x1="60" y1="25" x2="100" y2="55" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#0D9488" />
                    <stop offset="100%" stopColor="#0284C7" />
                  </linearGradient>
                </defs>
                {/* Handle */}
                <rect x="58" y="32" width="44" height="22" rx="6" fill="none" stroke="url(#handleTeal)" strokeWidth="6" />
                {/* Briefcase Body */}
                <rect x="25" y="50" width="110" height="75" rx="14" fill="url(#briefcaseCyan)" />
                {/* Center Clasp */}
                <rect x="70" y="68" width="20" height="18" rx="4" fill="#9FE870" />
                {/* Highlight line */}
                <line x1="25" y1="50" x2="135" y2="50" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
              </svg>
            }
          />
        </div>

        {/* Reference 3: Bottom Policy Disclaimer */}
        <div className="mt-12 sm:mt-16 text-center text-xs text-[#5F625E] max-w-lg mx-auto leading-relaxed">
          <span>You must use Parakh in line with our </span>
          <a
            href="https://github.com/puneetnith28/Parakh"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-[#111111] underline hover:text-[#163300] inline-flex items-center gap-0.5"
          >
            Responsible Assessment Standards <ExternalLink className="w-3 h-3" />
          </a>
          <span>. Ungrounded claims without commit citations are strictly prohibited.</span>
        </div>
      </main>
    </div>
  );
};

export default EvaluationModeModal;
