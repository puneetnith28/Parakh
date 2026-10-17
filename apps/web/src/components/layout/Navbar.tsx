import React, { useState } from 'react';
import { ShieldCheck, Activity, Menu, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E2E5DE] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#163300] flex items-center justify-center text-[#9FE870] group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5 text-[#9FE870]" />
          </div>
          <div className="flex items-baseline">
            <span className="font-display text-xl sm:text-2xl tracking-tight text-[#111111]">
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
        <div className="flex items-center gap-2 sm:gap-3.5">
          {/* API Health Pill (Desktop) */}
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
              className="text-xs sm:text-sm font-bold shadow-sm px-4 sm:px-5 py-2 sm:py-2.5"
            >
              Start Assessment
            </Button>
          )}

          {/* Mobile Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-[#111111] hover:bg-[#F2F4F0] focus-visible:ring-2 focus-visible:ring-[#163300]"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 w-72 max-w-[85vw] bg-white p-6 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-6 border-b border-[#E2E5DE]">
              <span className="font-display text-xl text-[#111111]">MENU</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl text-[#5F625E] hover:text-[#111111] hover:bg-[#F2F4F0]"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 py-6 space-y-4">
              <button
                type="button"
                onClick={() => {
                  onNavigateHome?.();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2.5 text-base font-bold text-[#111111] hover:text-[#163300]"
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigateDashboard?.();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2.5 text-base font-bold text-[#111111] hover:text-[#163300]"
              >
                Dashboard
              </button>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2.5 text-base font-medium text-[#5F625E] hover:text-[#111111]"
              >
                How it Works
              </a>
              <a
                href="#evidence-grounding"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2.5 text-base font-medium text-[#5F625E] hover:text-[#111111]"
              >
                Evidence Grounding
              </a>
            </div>

            <div className="pt-6 border-t border-[#E2E5DE] space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-[#5F625E]">
                <Activity className="w-3.5 h-3.5 text-[#163300]" />
                <span>API Status: {apiStatus}</span>
              </div>
              {onStartAssessment && (
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => {
                    onStartAssessment();
                    setMobileMenuOpen(false);
                  }}
                  className="font-bold text-sm shadow-sm"
                >
                  Start Assessment
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
