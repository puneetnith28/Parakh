import React from 'react';
import { ShieldCheck, Activity } from 'lucide-react';
import { Button } from '../ui/Button';

export interface NavbarProps {
  apiStatus?: 'checking' | 'online' | 'offline';
  onStartAssessment?: () => void;
  onNavigateHome?: () => void;
  onNavigateDashboard?: () => void;
  currentView?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  apiStatus = 'online',
  onStartAssessment,
  onNavigateHome,
  onNavigateDashboard,
  currentView = 'landing',
}) => {
  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E2E5DE] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-full bg-[#163300] flex items-center justify-center text-[#9FE870] group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5 text-[#9FE870]" />
          </div>
          <div className="flex items-baseline">
            <span className="font-display text-2xl tracking-tight text-[#111111]">
              PARAKH
            </span>
            <span className="w-2 h-2 rounded-full bg-[#9FE870] ml-1 mb-1" />
          </div>
        </div>

        {/* Center Nav Links (Desktop) */}
        <div className="hidden md:flex items-center gap-8">
          <button
            type="button"
            onClick={onNavigateHome}
            className={`text-sm font-medium transition-colors ${
              currentView === 'landing'
                ? 'text-[#163300] font-bold border-b-2 border-[#163300] py-1'
                : 'text-[#5F625E] hover:text-[#111111]'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={onNavigateDashboard}
            className={`text-sm font-medium transition-colors ${
              currentView === 'dashboard'
                ? 'text-[#163300] font-bold border-b-2 border-[#163300] py-1'
                : 'text-[#5F625E] hover:text-[#111111]'
            }`}
          >
            Dashboard
          </button>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-[#5F625E] hover:text-[#111111] transition-colors"
          >
            How it Works
          </a>
          <a
            href="#evidence-grounding"
            className="text-sm font-medium text-[#5F625E] hover:text-[#111111] transition-colors"
          >
            Evidence Grounding
          </a>
        </div>

        {/* Right CTA & Status */}
        <div className="flex items-center gap-3.5">
          {/* API Health Pill */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F2F4F0] text-xs font-mono text-[#5F625E]">
            <Activity
              className={`w-3.5 h-3.5 ${
                apiStatus === 'online'
                  ? 'text-[#163300]'
                  : apiStatus === 'checking'
                  ? 'text-amber-600 animate-pulse'
                  : 'text-rose-600'
              }`}
            />
            <span className="capitalize">{apiStatus}</span>
          </div>

          {onStartAssessment && (
            <Button
              variant="primary"
              size="sm"
              onClick={onStartAssessment}
              className="text-xs sm:text-sm font-bold shadow-sm"
            >
              Start Assessment
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
