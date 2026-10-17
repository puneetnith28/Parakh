import React from 'react';
import {
  Home,
  FileCheck,
  LayoutGrid,
  ClipboardList,
  Plus,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/Button';

export type DashboardNavTab = 'home' | 'assessments' | 'evidence' | 'action-plan' | 'manage';

export interface SidebarProps {
  activeTab: DashboardNavTab;
  onSelectTab: (tab: DashboardNavTab) => void;
  onNewAssessment: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onNewAssessment,
  className = '',
}) => {
  const navItems = [
    { id: 'home' as const, label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'assessments' as const, label: 'Assessments', icon: <FileCheck className="w-5 h-5" /> },
    { id: 'evidence' as const, label: 'Evidence Map', icon: <LayoutGrid className="w-5 h-5" /> },
    { id: 'action-plan' as const, label: 'Action Plan', icon: <ClipboardList className="w-5 h-5" /> },
  ];

  return (
    <div className={`flex flex-col h-full w-full ${className}`}>
      {/* Brand Header */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-full bg-[#163300] flex items-center justify-center text-[#9FE870]">
          <ShieldCheck className="w-5 h-5 text-[#9FE870]" />
        </div>
        <div className="flex items-baseline">
          <span className="font-display text-2xl tracking-tight text-[#111111]">
            PARAKH
          </span>
          <span className="w-2 h-2 rounded-full bg-[#9FE870] ml-1 mb-1" />
        </div>
      </div>

      {/* Reference 2 Pill Primary Action Button */}
      <div className="mb-8">
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={onNewAssessment}
          icon={<Plus className="w-4 h-4" />}
          className="font-bold py-3.5 shadow-sm text-sm"
        >
          New assessment
        </Button>
      </div>

      {/* Sidebar Navigation Items matching Reference 2 */}
      <nav className="flex-1 space-y-1.5" aria-label="Sidebar Navigation">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all text-left outline-none ${
                isActive
                  ? 'bg-[#F2F4F0] text-[#111111] font-bold'
                  : 'text-[#5F625E] hover:text-[#111111] hover:bg-[#F8F9F7]'
              } focus-visible:ring-2 focus-visible:ring-[#163300]`}
            >
              <span
                className={`transition-colors ${
                  isActive ? 'text-[#163300]' : 'text-[#828580]'
                }`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Metadata */}
      <div className="pt-6 border-t border-[#E2E5DE] mt-auto">
        <div className="text-[11px] font-mono text-[#828580] mb-2">
          ENGINE: gemini-3.8-flash
        </div>
        <a
          href="https://github.com/puneetnith28/Parakh"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[#5F625E] hover:text-[#111111] transition-colors"
        >
          <span>Repository docs</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export default Sidebar;
