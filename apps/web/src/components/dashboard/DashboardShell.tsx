import React, { useState } from 'react';
import { Menu, X, User } from 'lucide-react';
import { Sidebar, DashboardNavTab } from './Sidebar';
export type { DashboardNavTab };

export interface DashboardShellProps {
  title?: string;
  activeTab: DashboardNavTab;
  onSelectTab: (tab: DashboardNavTab) => void;
  onNewAssessment: () => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  title = 'Assessments',
  activeTab,
  onSelectTab,
  onNewAssessment,
  headerRight,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col lg:flex-row w-full overflow-x-hidden">
      {/* Mobile Top Header (< 1024px) */}
      <header className="lg:hidden flex items-center justify-between px-5 py-4 bg-white border-b border-[#E2E5DE] sticky top-0 z-40">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 -ml-2 rounded-xl text-[#111111] hover:bg-[#F2F4F0] focus-visible:ring-2 focus-visible:ring-[#163300]"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <span className="font-bold text-lg text-[#111111] tracking-tight">{title}</span>
        <div className="w-8 h-8 rounded-full bg-[#F2F4F0] flex items-center justify-center text-[#5F625E]">
          <User className="w-4 h-4" />
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white p-6 shadow-2xl flex flex-col z-50">
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl text-[#5F625E] hover:bg-[#F2F4F0]"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar
              activeTab={activeTab}
              onSelectTab={(tab) => {
                onSelectTab(tab);
                setMobileMenuOpen(false);
              }}
              onNewAssessment={() => {
                onNewAssessment();
                setMobileMenuOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Desktop Fixed Sidebar (Reference 2 layout) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 lg:shrink-0 lg:border-r lg:border-[#E2E5DE] bg-white p-6 sticky top-0 h-screen overflow-y-auto">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          onNewAssessment={onNewAssessment}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full bg-white">
        {/* Desktop Top Bar */}
        <div className="hidden lg:flex items-center justify-between px-10 xl:px-14 pt-8 pb-4">
          <h1 className="font-headline text-3xl font-bold text-[#111111] tracking-tight">
            {title}
          </h1>

          <div className="flex items-center gap-4">
            {headerRight}
            <div className="w-9 h-9 rounded-full bg-[#F2F4F0] border border-[#E2E5DE] flex items-center justify-center text-[#5F625E] hover:text-[#111111] cursor-pointer transition-colors">
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Content Body */}
        <main className="flex-1 px-4 sm:px-8 lg:px-10 xl:px-14 py-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
