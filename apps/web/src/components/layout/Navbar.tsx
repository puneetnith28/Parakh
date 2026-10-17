import React, { useState } from 'react';
import { ShieldCheck, Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';

export interface NavbarProps {
  apiStatus?: 'checking' | 'online' | 'offline';
  onStartAssessment?: () => void;
  onNavigateHome?: () => void;
  onNavigateDashboard?: () => void;
  currentView?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onStartAssessment,
  onNavigateHome,
  onNavigateDashboard,
  currentView = 'landing',
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleScrollTo = (id: string) => {
    const doScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        const navOffset = 90;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - navOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    };

    if (currentView !== 'landing') {
      onNavigateHome?.();
      setTimeout(doScroll, 100);
    } else {
      doScroll();
    }
  };

  return (
    <>
      {/* Floating Navbar Island */}
      <header className="fixed top-3 sm:top-5 inset-x-0 z-50 flex justify-center px-3 sm:px-6 pointer-events-none">
        <nav className="pointer-events-auto w-full max-w-5xl bg-white/90 backdrop-blur-md rounded-full border border-[#E2E5DE] shadow-sm shadow-black/[0.04] px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between transition-all">
          {/* Brand / Logo */}
          <div
            onClick={onNavigateHome}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#163300] flex items-center justify-center text-[#9FE870] group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#9FE870]" />
            </div>
            <div className="flex items-baseline">
              <span className="font-display text-lg sm:text-xl tracking-tight text-[#111111]">
                PARAKH
              </span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#9FE870] ml-0.5 sm:ml-1 mb-0.5 sm:mb-1" />
            </div>
          </div>

          {/* Center Nav Links (Desktop) */}
          <div className="hidden md:flex items-center gap-8">
            <button
              type="button"
              onClick={onNavigateDashboard}
              className={`text-sm font-medium transition-colors ${
                currentView === 'dashboard'
                  ? 'text-[#163300] font-bold'
                  : 'text-[#5F625E] hover:text-[#111111]'
              }`}
            >
              Dashboard
            </button>
            <a
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault();
                handleScrollTo('how-it-works');
              }}
              className="text-sm font-medium text-[#5F625E] hover:text-[#111111] transition-colors cursor-pointer"
            >
              How it Works
            </a>
            <a
              href="#evidence-grounding"
              onClick={(e) => {
                e.preventDefault();
                handleScrollTo('evidence-grounding');
              }}
              className="text-sm font-medium text-[#5F625E] hover:text-[#111111] transition-colors cursor-pointer"
            >
              Evidence Grounding
            </a>
          </div>

          {/* Right Action */}
          <div className="flex items-center gap-2">
            {/* Desktop Start Assessment Button */}
            {onStartAssessment && (
              <Button
                variant="primary"
                size="sm"
                onClick={onStartAssessment}
                className="hidden sm:inline-flex text-xs sm:text-sm font-bold shadow-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-full"
              >
                Start Assessment
              </Button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-full text-[#111111] hover:bg-[#F2F4F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#163300] transition-colors"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 w-72 max-w-[85vw] bg-white p-6 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-5 border-b border-[#E2E5DE]">
              <div className="flex items-center gap-2">
                <span className="font-display text-xl text-[#111111]">PARAKH</span>
                <span className="w-2 h-2 rounded-full bg-[#9FE870] mb-0.5" />
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-full text-[#5F625E] hover:text-[#111111] hover:bg-[#F2F4F0] transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Links */}
            <div className="flex-1 py-6 space-y-3">
              <button
                type="button"
                onClick={() => {
                  onNavigateDashboard?.();
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left py-2.5 px-3 rounded-xl text-base font-medium transition-colors ${
                  currentView === 'dashboard'
                    ? 'bg-[#F2F4F0] text-[#163300] font-bold'
                    : 'text-[#111111] hover:bg-[#F2F4F0]'
                }`}
              >
                Dashboard
              </button>
              <a
                href="#how-it-works"
                onClick={(e) => {
                  e.preventDefault();
                  handleScrollTo('how-it-works');
                  setMobileMenuOpen(false);
                }}
                className="block py-2.5 px-3 rounded-xl text-base font-medium text-[#5F625E] hover:text-[#111111] hover:bg-[#F2F4F0] transition-colors cursor-pointer"
              >
                How it Works
              </a>
              <a
                href="#evidence-grounding"
                onClick={(e) => {
                  e.preventDefault();
                  handleScrollTo('evidence-grounding');
                  setMobileMenuOpen(false);
                }}
                className="block py-2.5 px-3 rounded-xl text-base font-medium text-[#5F625E] hover:text-[#111111] hover:bg-[#F2F4F0] transition-colors cursor-pointer"
              >
                Evidence Grounding
              </a>
            </div>

            {/* Mobile Bottom: Start Assessment CTA */}
            {onStartAssessment && (
              <div className="pt-4 border-t border-[#E2E5DE]">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    onStartAssessment();
                    setMobileMenuOpen(false);
                  }}
                  className="font-bold text-sm shadow-sm rounded-full py-3"
                >
                  Start Assessment
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
