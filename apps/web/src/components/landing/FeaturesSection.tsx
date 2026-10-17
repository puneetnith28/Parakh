import React, { useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle,
  AlertCircle,
  Download,
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export interface FeaturesSectionProps {
  onTryFeature?: (feature: string) => void;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = () => {
  const [activeTab, setActiveTab] = useState<'extraction' | 'grounding' | 'calibration' | 'export'>('extraction');

  const tabs = [
    { id: 'extraction', label: 'Brief Deconstruction', icon: <FileText className="w-4 h-4" /> },
    { id: 'grounding', label: 'Code AST Grounding', icon: <Search className="w-4 h-4" /> },
    { id: 'calibration', label: 'Uncertainty Calibration', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'export', label: 'Proposal & Audit Export', icon: <Download className="w-4 h-4" /> },
  ] as const;

  return (
    <section id="features" className="py-20 bg-white border-t border-[#E2E5DE]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#163300] bg-[#9FE870]/30 px-3.5 py-1.5 rounded-full border border-[#9FE870]/60">
            Core Architecture
          </span>
          <h2 className="font-display text-3xl sm:text-5xl text-[#111111] uppercase tracking-tight mt-4">
            EVALUATION GROUNDED IN OBSERVABLE CODE
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5F625E]">
            Parakh eliminates speculative developer evaluations by anchoring every single claim to parsed code, commit trees, and transparent reasoning.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#163300] text-white shadow-sm'
                  : 'bg-[#F2F4F0] text-[#5F625E] hover:text-[#111111] hover:bg-[#EAECE7]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Tab Panel */}
        <div className="bg-[#F2F4F0] rounded-[28px] p-6 sm:p-10 border border-[#E2E5DE]">
          {activeTab === 'extraction' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <Badge variant="lime" size="sm" className="mb-3">Automatic Deconstruction</Badge>
                <h3 className="font-display text-2xl sm:text-3xl text-[#111111] uppercase">
                  UNSTRUCTURED BRIEF TO VERIFIABLE CRITERIA
                </h3>
                <p className="mt-4 text-sm sm:text-base text-[#5F625E] leading-relaxed">
                  Ingest raw markdown, PDF job briefs, or engineering test specs. The pipeline extracts distinct requirement criteria, assigns difficulty tiers, classifies functional vs architectural domains, and detects implicit testing expectations.
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-[#111111]">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#163300]" />
                    Automatic priority tiering (High / Medium / Low)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#163300]" />
                    Interactive in-place requirement editing before repository evaluation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#163300]" />
                    Deterministic rule-based fallback when model quota is constrained
                  </li>
                </ul>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-[#E2E5DE] shadow-sm">
                <div className="text-xs font-mono font-bold text-[#5F625E] mb-3">PARSED SPECIFICATION</div>
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 bg-[#F2F4F0] rounded-xl border border-[#E2E5DE]">
                    <span className="text-[#163300] font-bold">REQ-01:</span> Provenance Integrity Verification
                    <div className="text-[11px] text-[#5F625E] mt-1">Status: Hash verification on tampered JSON payloads</div>
                  </div>
                  <div className="p-3 bg-[#F2F4F0] rounded-xl border border-[#E2E5DE]">
                    <span className="text-[#163300] font-bold">REQ-02:</span> SSRF Boundary Guardrails
                    <div className="text-[11px] text-[#5F625E] mt-1">Status: IPv4/IPv6 loopback & cloud metadata rejection</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'grounding' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <Badge variant="lime" size="sm" className="mb-3">Deterministic Code Index</Badge>
                <h3 className="font-display text-2xl sm:text-3xl text-[#111111] uppercase">
                  ABSTRACT SYNTAX TREE & CHUNK SEARCH
                </h3>
                <p className="mt-4 text-sm sm:text-base text-[#5F625E] leading-relaxed">
                  Scans target repositories up to 150 files and 200KB per file. Code is segmented into syntactically valid function and type chunks, scoring similarity against requirement descriptions to surface verifiable citations.
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-[#111111]">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#163300]" />
                    Commit SHA pinned at HEAD resolution
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#163300]" />
                    Precise file path and 1-indexed line ranges
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#163300]" />
                    Zero hallucinated line citations
                  </li>
                </ul>
              </div>
              <div className="bg-[#163300] text-emerald-100 rounded-2xl p-6 font-mono text-xs shadow-inner">
                <div className="text-emerald-400 mb-2">// Pinned Tree Search</div>
                <div>repo: <span className="text-white">puneetnith28/Parakh</span></div>
                <div>sha: <span className="text-[#9FE870]">848ce1d9f01bb431b643724acb6d5b537518d559</span></div>
                <div className="mt-3 text-emerald-300">Found 18 evidence citations across 12 files.</div>
                <div className="mt-1 text-white/70">Exact line match: apps/api/src/services/provenance.ts#L48</div>
              </div>
            </div>
          )}

          {activeTab === 'calibration' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <Badge variant="lime" size="sm" className="mb-3">Truthful Uncertainty</Badge>
                <h3 className="font-display text-2xl sm:text-3xl text-[#111111] uppercase">
                  CONFIDENCE WITHOUT FALSE CERTAINTY
                </h3>
                <p className="mt-4 text-sm sm:text-base text-[#5F625E] leading-relaxed">
                  Unlike conventional LLM wrappers that claim 100% confidence on ambiguous code, Parakh features an honest confidence metric: Low, Medium, and High. Requirements with insufficient proof are flagged for human review.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-[#E2E5DE]">
                  <div className="text-xs font-bold text-[#5F625E]">DEMONSTRATED</div>
                  <div className="text-3xl font-display text-[#163300] mt-1">94%</div>
                  <div className="text-xs text-[#5F625E] mt-1">Direct test & code proof</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-[#E2E5DE]">
                  <div className="text-xs font-bold text-[#5F625E]">NEEDS REVIEW</div>
                  <div className="text-3xl font-display text-sky-700 mt-1">6%</div>
                  <div className="text-xs text-[#5F625E] mt-1">Flagged for manual inspection</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <Badge variant="lime" size="sm" className="mb-3">Executive Deliverables</Badge>
                <h3 className="font-display text-2xl sm:text-3xl text-[#111111] uppercase">
                  ACTION PLAN & PROPOSAL GENERATOR
                </h3>
                <p className="mt-4 text-sm sm:text-base text-[#5F625E] leading-relaxed">
                  Generate professional evaluation kits for hiring managers, engineering leaders, and clients. Includes gap closure checklists, tamper-evident HTML/JSON exports, and secure view tokens.
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-[#E2E5DE] space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#F2F4F0] rounded-xl">
                  <div className="text-xs font-bold text-[#111111]">Gap Closure Checklist</div>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#E2E5DE]">Ready</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F2F4F0] rounded-xl">
                  <div className="text-xs font-bold text-[#111111]">Tamper-Proof JSON Report</div>
                  <span className="text-[10px] font-mono bg-[#9FE870] text-[#163300] font-bold px-2 py-0.5 rounded">HMAC-SHA256</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
