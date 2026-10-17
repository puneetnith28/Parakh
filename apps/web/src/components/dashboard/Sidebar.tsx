import React, { useEffect, useState } from 'react';
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
import { fetchHealthDiagnostics, HealthDiagnosticsResult } from '../../services/api';

export type DashboardNavTab = 'home' | 'assessments' | 'evidence' | 'action-plan' | 'manage';

export interface SidebarProps {
  activeTab: DashboardNavTab;
  onSelectTab: (tab: DashboardNavTab) => void;
  onNewAssessment: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
  diagnostics?: HealthDiagnosticsResult | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onNewAssessment,
  isCollapsed = false,
  onToggleCollapse,
  className = '',
  diagnostics: propDiagnostics,
}) => {
  const [diagnostics, setDiagnostics] = useState<HealthDiagnosticsResult | null>(propDiagnostics || null);

  useEffect(() => {
    if (propDiagnostics) {
      setDiagnostics(propDiagnostics);
      return;
    }
    let isMounted = true;
    fetchHealthDiagnostics()
      .then((data) => {
        if (isMounted) setDiagnostics(data);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [propDiagnostics]);

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

      {/* Bottom Telemetry & Metadata */}
      <div className={`pt-4 border-t border-[#E2E5DE] ${isCollapsed ? 'text-center' : ''}`}>
        {isCollapsed ? (
          <a
            href="https://github.com/puneetnith28/Parakh"
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-[#5F625E] hover:text-[#111111] hover:bg-[#F2F4F0] transition-colors relative group"
            title={
              diagnostics
                ? `Engine: ${diagnostics.isMockModel ? 'Deterministic Rule Engine' : 'Google Gemini (Live)'} • Storage: ${diagnostics.storage?.storageMode || 'persistent'}`
                : 'Repository docs — Parakh'
            }
          >
            <span
              className={`w-2 h-2 rounded-full absolute top-2 right-2 ${
                diagnostics?.status === 'ok'
                  ? diagnostics.isMockModel
                    ? 'bg-amber-400'
                    : 'bg-[#9FE870]'
                  : 'bg-[#828580]'
              }`}
            />
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#5F625E]">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  diagnostics?.status === 'ok'
                    ? diagnostics.isMockModel
                      ? 'bg-amber-500'
                      : 'bg-[#163300] ring-2 ring-[#9FE870]'
                    : 'bg-[#828580]'
                }`}
              />
              <span className="font-semibold truncate text-[#111111]">
                {diagnostics
                  ? diagnostics.isMockModel
                    ? 'RULE ENGINE (MOCK)'
                    : 'GEMINI 1.5 PRO / FLASH'
                  : 'ENGINE: CONNECTING...'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#5F625E]">
              <span className="font-mono text-[10px] truncate">
                {diagnostics?.storage?.storageMode === 'mongodb' ? 'Mongo Durable' : 'Memory Cache'}
              </span>
              <a
                href="https://github.com/puneetnith28/Parakh"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#163300] hover:underline font-semibold"
              >
                <span>Docs</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
