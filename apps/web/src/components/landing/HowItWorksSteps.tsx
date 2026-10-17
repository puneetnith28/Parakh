import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  FolderGit2,
  Cpu,
  Award,
  CheckCircle2,
  FileCheck2,
  ListFilter,
  Download,
  Share2,
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export interface HowItWorksStepsProps {
  onStartAssessment?: () => void;
}

interface StepData {
  stepNumber: string;
  tag: string;
  title: string;
  description: string;
  renderVisual: () => React.ReactNode;
}

export const HowItWorksSteps: React.FC<HowItWorksStepsProps> = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const steps: StepData[] = [
    {
      stepNumber: '01',
      tag: 'Step 01 — Profile & Criteria Setup',
      title: 'DEFINE CRITERIA & EVALUATION PROFILE',
      description:
        'Select an industry assessment template (e.g. Senior Platform Engineer, Agency Client RFP, or Security Due Diligence) or paste custom requirements. Parakh configures multi-pillar evaluation dimensions and competency weightings.',
      renderVisual: () => (
        <div className="bg-[#F2F4F0] rounded-3xl p-6 sm:p-8 border border-[#E2E5DE] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E5DE]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#163300]" />
              <span className="text-xs font-mono font-bold text-[#111111]">Profile: Full-Stack Platform Spec</span>
            </div>
            <Badge variant="lime" size="sm">4 Pillars Configured</Badge>
          </div>

          <div className="space-y-2.5">
            <div className="bg-white p-3 rounded-2xl border border-[#E2E5DE] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#163300]" />
                <span className="text-xs font-bold text-[#111111]">System Architecture & Design Patterns</span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                35% WEIGHT
              </span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-[#E2E5DE] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#163300]" />
                <span className="text-xs font-bold text-[#111111]">Automated Testing & Coverage Health</span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                25% WEIGHT
              </span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-[#E2E5DE] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#163300]" />
                <span className="text-xs font-bold text-[#111111]">Security & Defensive Coding Practices</span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                20% WEIGHT
              </span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-[#E2E5DE] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#163300]" />
                <span className="text-xs font-bold text-[#111111]">API Contract Stability & Resilience</span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                20% WEIGHT
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-[#5F625E]">
            <span>Calibrated Rubric: 8 Core Competencies</span>
            <span className="font-mono text-[#163300] font-bold">Ready for scan</span>
          </div>
        </div>
      ),
    },
    {
      stepNumber: '02',
      tag: 'Step 02 — Codebase Scoping',
      title: 'LINK REPOSITORY & CONFIGURE SCAN SCOPE',
      description:
        'Point Parakh to any public or private GitHub repository and select your branch target. Define precise directory inclusions for core domain logic and test suites while automatically bypassing generated build outputs and lockfiles.',
      renderVisual: () => (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E5DE] shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E5DE]">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-[#163300]" />
              <span className="text-xs font-mono font-bold text-[#111111]">Repository Scope Configuration</span>
            </div>
            <Badge variant="dark" size="sm">Branch: main</Badge>
          </div>

          <div className="bg-[#F2F4F0] p-3 rounded-xl font-mono text-xs text-[#111111] flex items-center justify-between">
            <span className="truncate">github.com/organization/core-service</span>
            <span className="text-xs text-[#163300] font-bold shrink-0 ml-2">TARGET ATTACHED</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-emerald-900">
              <span className="flex items-center gap-2 font-medium">
                <ListFilter className="w-4 h-4 text-emerald-600" />
                Inclusions: src/**/*.ts, packages/**/*.ts
              </span>
              <span className="font-mono text-[10px] font-bold">142 FILES</span>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-emerald-900">
              <span className="flex items-center gap-2 font-medium">
                <ListFilter className="w-4 h-4 text-emerald-600" />
                Test Suites: tests/**/*.spec.ts, *.test.ts
              </span>
              <span className="font-mono text-[10px] font-bold">28 SUITES</span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F2F4F0] text-[#5F625E] flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#CBD0C5]" />
                Auto-Excluded: node_modules/, dist/, *.lock
              </span>
              <span className="font-mono text-[10px] font-bold">SKIPPED</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      stepNumber: '03',
      tag: 'Step 03 — Multi-Engine Analysis',
      title: 'CROSS-ANALYZE REPO IMPLEMENTATIONS',
      description:
        'Parakh executes a syntax-aware dual-engine audit: AST parsing maps classes, exported interfaces, and architectural patterns, while test execution analysis verifies that requirements function with genuine test assertions.',
      renderVisual: () => (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E5DE] shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E5DE]">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#163300]" />
              <span className="text-xs font-mono font-bold text-[#111111]">Dual-Engine Pipeline Stream</span>
            </div>
            <Badge variant="lime" size="sm">Active Correlation</Badge>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F2F4F0] text-[#111111]">
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#163300]" />
                AST Syntax Tree Decomposition
              </span>
              <span className="font-mono text-[10px] font-bold text-[#163300]">100% PARSED</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F2F4F0] text-[#111111]">
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#163300]" />
                Requirement-to-Code Mapping
              </span>
              <span className="font-mono text-[10px] font-bold text-[#163300]">14/16 MATCHED</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F2F4F0] text-[#111111]">
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#163300]" />
                Test Assertion Verification
              </span>
              <span className="font-mono text-[10px] font-bold text-[#163300]">28 SUITES TRACED</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
            <span className="flex items-center gap-1.5 font-medium">
              <FileCheck2 className="w-4 h-4 text-emerald-700" />
              16 Evidence Anchors Correlated
            </span>
            <span className="font-mono text-[10px] font-bold text-emerald-700">0 Speculation</span>
          </div>
        </div>
      ),
    },
    {
      stepNumber: '04',
      tag: 'Step 04 — Scorecard & Action Plan',
      title: 'REVIEW CAPABILITY SCORE & ACTION KIT',
      description:
        'Explore a comprehensive capability scorecard with categorized scores and line-level proof trails. Convert uncovered gaps into actionable developer remediation tasks, executive PDF summaries, or client-ready proposal responses.',
      renderVisual: () => (
        <div className="bg-[#F2F4F0] rounded-3xl p-6 sm:p-8 border border-[#E2E5DE] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E5DE]">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#163300]" />
              <span className="text-xs font-mono text-[#111111] font-bold uppercase tracking-wider">
                Overall Capability Score
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-display font-bold text-[#163300]">88/100</span>
              <Badge variant="dark" size="sm">Production Ready</Badge>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="bg-white p-3 rounded-2xl border border-[#E2E5DE] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#163300] text-[#9FE870] flex items-center justify-center font-bold text-xs">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#111111]">Executive Audit & Scorecard</div>
                  <div className="text-[10px] text-[#5F625E]">Export in PDF, JSON, or Markdown</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#163300] font-bold">READY</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-[#E2E5DE] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#9FE870] text-[#163300] flex items-center justify-center font-bold text-xs">
                  <Share2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#111111]">Client Proposal Response Kit</div>
                  <div className="text-[10px] text-[#5F625E]">Evidence-grounded capability response</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#163300] font-bold">READY</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-[#E2E5DE] flex items-center justify-between text-xs">
            <span className="text-[11px] text-[#5F625E]">Gap Remediation Backlog</span>
            <span className="text-amber-800 font-bold font-mono text-[10px] bg-amber-50 px-2 py-0.5 rounded-full">
              2 Action Items Identified
            </span>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = useCallback(() => {
    setDirection(1);
    setCurrentStep((prev) => (prev + 1) % steps.length);
  }, [steps.length]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length);
  }, [steps.length]);

  const handleSelectStep = (index: number) => {
    setDirection(index > currentStep ? 1 : -1);
    setCurrentStep(index);
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      handleNext();
    }, 7000);
    return () => clearInterval(interval);
  }, [isPaused, handleNext]);

  const activeStep = steps[currentStep];

  return (
    <div
      className="space-y-8"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Top Controller Bar: Step Pills & Forward/Backward Arrows */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E5DE]">
        {/* Step Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {steps.map((step, idx) => (
            <button
              key={step.stepNumber}
              type="button"
              onClick={() => handleSelectStep(idx)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 select-none cursor-pointer ${
                currentStep === idx
                  ? 'bg-[#163300] text-white shadow-sm font-bold'
                  : 'bg-[#F2F4F0] text-[#5F625E] hover:text-[#111111] hover:bg-[#EAECE7]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${currentStep === idx ? 'bg-[#9FE870]' : 'bg-[#CBD0C5]'}`} />
              <span>Step {step.stepNumber}</span>
            </button>
          ))}
        </div>

        {/* Counter and Forward / Backward Navigation Arrows */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-xs font-mono font-bold text-[#5F625E] tracking-wider mr-1">
            {activeStep.stepNumber} <span className="text-[#CBD0C5]">/</span> 0{steps.length}
          </span>

          <button
            type="button"
            onClick={handlePrev}
            className="p-2.5 rounded-full bg-white hover:bg-[#163300] text-[#163300] hover:text-white border-2 border-[#163300] transition-all shadow-xs active:scale-95 cursor-pointer"
            aria-label="Previous step"
            title="Previous step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="p-2.5 rounded-full bg-white hover:bg-[#163300] text-[#163300] hover:text-white border-2 border-[#163300] transition-all shadow-xs active:scale-95 cursor-pointer"
            aria-label="Next step"
            title="Next step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Animated Step Content Container */}
      <div className="relative min-h-[440px] overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeStep.stepNumber}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 35 : -35 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -35 : 35 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          >
            {/* Left Content Column */}
            <div className="flex flex-col justify-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5F625E] bg-[#F2F4F0] px-3.5 py-1.5 rounded-full inline-block self-start">
                {activeStep.tag}
              </span>

              <h3 className="font-display text-3xl sm:text-4xl md:text-5xl text-[#111111] uppercase tracking-tight mt-4 leading-tight">
                {activeStep.title}
              </h3>

              <p className="mt-4 text-base sm:text-lg text-[#5F625E] leading-relaxed">
                {activeStep.description}
              </p>
            </div>

            {/* Right Interactive Visual Card */}
            <div className="w-full">
              {activeStep.renderVisual()}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HowItWorksSteps;
