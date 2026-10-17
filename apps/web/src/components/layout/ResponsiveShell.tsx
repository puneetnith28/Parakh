import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

export interface ResponsiveShellProps {
  sidebar?: React.ReactNode;
  headerRight?: React.ReactNode;
  logo?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveShell: React.FC<ResponsiveShellProps> = ({
  sidebar,
  headerRight,
  logo,
  children,
  className = '',
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={`min-h-screen bg-white text-[#111111] flex flex-col lg:flex-row w-full overflow-x-hidden ${className}`}>
      {/* Mobile Top Navigation Bar (< 1024px) */}
      {sidebar && (
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#E2E5DE] sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[#111111] hover:bg-[#F2F4F0] focus-visible:ring-2 focus-visible:ring-[#163300] transition-colors"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {logo}
          </div>
          {headerRight && <div>{headerRight}</div>}
        </header>
      )}

      {/* Mobile Slide-out Drawer / Overlay */}
      {sidebar && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Sidebar Drawer */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white p-6 shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-6">
              {logo}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-[#5F625E] hover:text-[#111111] hover:bg-[#F2F4F0] focus-visible:ring-2 focus-visible:ring-[#163300]"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div
              className="flex-1 overflow-y-auto"
              onClick={() => setMobileMenuOpen(false)}
            >
              {sidebar}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Fixed Sidebar (>= 1024px) */}
      {sidebar && (
        <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 lg:shrink-0 lg:border-r lg:border-[#E2E5DE] lg:min-h-screen bg-white p-6 sticky top-0 h-screen overflow-y-auto">
          {logo && <div className="mb-8">{logo}</div>}
          <div className="flex-1 flex flex-col">{sidebar}</div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
};

export default ResponsiveShell;
