import React from 'react';
import {
  Home,
  FileCheck,
  LayoutGrid,
  ClipboardList,
  Plus,
  ShieldCheck,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '../ui/Button';

export type DashboardNavTab = 'home' | 'assessments' | 'evidence' | 'action-plan' | 'manage';

export interface SidebarProps {
  activeTab: DashboardNavTab;
  onSelectTab: (tab: DashboardNavTab) => void;
  onNewAssessment: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onNewAssessment,
  isCollapsed = false,
  onToggleCollapse,
  className = '',
}) => {
  const navItems = [
    { id: 'home' as const, label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'assessments' as const, label: 'Assessments', icon: <FileCheck className="w-5 h-5" /> },
    { id: 'evidence' as const, label: 'Evidence Map', icon: <LayoutGrid className="w-5 h-5" /> },
    { id: 'action-plan' as const, label: 'Action Plan', icon: <ClipboardList className="w-5 h-5" /> },
  ];

  return (
    <div className={`flex flex-col h-full w-full justify-between overflow-hidden select-none ${className}`}>
      {/* Top Section */}
      <div className="flex flex-col w-full">
        {/* Brand Header & Collapse Toggle */}
        <div className={`flex items-center mb-6 ${isCollapsed ? 'flex-col gap-3 justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full bg-[#163300] flex items-center justify-center text-[#9FE870] shrink-0"
              title="PARAKH"
            >
              <ShieldCheck className="w-5 h-5 text-[#9FE870]" />
            </div>
            {!isCollapsed && (
              <div className="flex items-baseline">
                <span className="font-display text-2xl tracking-tight text-[#111111]">
                  PARAKH
                </span>
                <span className="w-2 h-2 rounded-full bg-[#9FE870] ml-1 mb-1" />
              </div>
            )}
          </div>

          {/* Toggle Button */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-xl text-[#5F625E] hover:text-[#111111] hover:bg-[#F2F4F0] transition-colors cursor-pointer"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* Action Button: Full button when open, compact icon when collapsed */}
        <div className="mb-6">
          {isCollapsed ? (
            <button
              type="button"
              onClick={onNewAssessment}
              className="w-11 h-11 mx-auto rounded-2xl bg-[#163300] hover:bg-[#245305] text-[#9FE870] flex items-center justify-center shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="New assessment"
              aria-label="New assessment"
            >
              <Plus className="w-5 h-5" />
            </button>
          ) : (
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
          )}
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5" aria-label="Sidebar Navigation">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-2xl text-sm font-semibold transition-all outline-none cursor-pointer ${
                  isCollapsed
                    ? 'h-11 justify-center'
                    : 'gap-3.5 px-4 py-3 text-left'
                } ${
                  isActive
                    ? 'bg-[#F2F4F0] text-[#111111] font-bold'
                    : 'text-[#5F625E] hover:text-[#111111] hover:bg-[#F8F9F7]'
                } focus-visible:ring-2 focus-visible:ring-[#163300]`}
              >
                <span
                  className={`transition-colors shrink-0 ${
                    isActive ? 'text-[#163300]' : 'text-[#828580]'
                  }`}
                >
                  {item.icon}
                </span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Metadata */}
      <div className={`pt-4 border-t border-[#E2E5DE] ${isCollapsed ? 'text-center' : ''}`}>
        {isCollapsed ? (
          <a
            href="https://github.com/puneetnith28/Parakh"
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-[#5F625E] hover:text-[#111111] hover:bg-[#F2F4F0] transition-colors"
            title="Repository docs — gemini-3.8-flash"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <>
            <div className="text-[11px] font-mono text-[#828580] mb-2 truncate">
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
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
