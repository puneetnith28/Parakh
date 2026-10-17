import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';

export type AnalysisStep = 'validate' | 'ingest' | 'retrieve' | 'evaluate' | 'complete';

export interface AnalysisProgressProps {
  repoUrl: string;
  requirementsCount: number;
  statusMessage: string;
  error: string | null;
  onRetry: () => void;
  onCancel: () => void;
  onChangeTarget?: () => void;
}

interface StepItem {
  key: AnalysisStep;
  label: string;
  detail: string;
}

const STEPS: StepItem[] = [
  {
    key: 'validate',
    label: 'Validating Target Repository',
    detail: 'Checking URL integrity, SSRF boundaries, and resolving immutable commit SHA.',
  },
  {
    key: 'ingest',
    label: 'Scanning Git Tree & Filtering',
    detail: 'Traversing repo structure, filtering binaries, vendored code, and build artifacts.',
  },
  {
    key: 'retrieve',
    label: 'Candidate Evidence Retrieval',
    detail: 'Indexing files, extracting AST symbols, and ranking candidate snippets.',
  },
  {
    key: 'evaluate',
    label: 'Deterministic Citation Validation',
    detail: 'Verifying exact line ranges, testing file bounds, and enforcing conservative downgrade rules.',
  },
];

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  repoUrl,
  requirementsCount,
  statusMessage,
  error,
  onRetry,
  onCancel,
  onChangeTarget,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (error) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [error]);

  useEffect(() => {
    if (error) return;

    if (elapsedSeconds > 12) {
      setCurrentStepIndex(3);
    } else if (elapsedSeconds > 6) {
      setCurrentStepIndex(2);
    } else if (elapsedSeconds > 2) {
      setCurrentStepIndex(1);
    } else {
      setCurrentStepIndex(0);
    }
  }, [elapsedSeconds, error]);

  const classifyError = (msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes('429') || lower.includes('rate limit') || lower.includes('quota')) {
      return {
        title: 'API Rate Limit Reached',
        description: 'Public GitHub API or AI model free-tier rate limits were temporarily exceeded.',
        solution: 'Wait a brief moment before retrying, or configure a personal access token.',
      };
    }
    if (lower.includes('400') || lower.includes('ssrf') || lower.includes('invalid repository') || lower.includes('not found')) {
      return {
        title: 'Invalid or Inaccessible Repository',
        description: 'The provided repository URL does not exist, is private, or was blocked by security boundaries.',
        solution: 'Ensure the repository is public and accessible at https://github.com/owner/repo.',
      };
    }
    if (lower.includes('503') || lower.includes('500') || lower.includes('unavailable') || lower.includes('timeout')) {
      return {
        title: 'Inference Engine Unavailable',
        description: 'The AI Studio reasoning model or assessment service failed to respond within the deadline.',
        solution: 'Retry the request or verify model availability.',
      };
    }
    return {
      title: 'Analysis Interrupted',
      description: msg,
      solution: 'Please check your network connection and retry the analysis.',
    };
  };

  if (error) {
    const errDetails = classifyError(error);

    return (
      <div className="bg-white border border-[#E2E5DE] rounded-[28px] p-6 sm:p-10 max-w-2xl mx-auto shadow-sm space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-[#111111]">{errDetails.title}</h3>
            <p className="text-xs font-mono text-[#5F625E]">Target: {repoUrl}</p>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-1.5">
          <p className="text-sm text-rose-900 font-semibold">{errDetails.description}</p>
          <p className="text-xs text-rose-700">{errDetails.solution}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E2E5DE]">
          <div className="flex items-center gap-2">
            <Button
              onClick={onRetry}
              variant="primary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              className="font-bold text-xs"
            >
              Retry Analysis
            </Button>
            <Button
              onClick={onCancel}
              variant="secondary"
              size="sm"
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="font-bold text-xs"
            >
              Edit Requirements
            </Button>
          </div>

          {onChangeTarget && (
            <Button
              onClick={onChangeTarget}
              variant="ghost"
              size="sm"
              className="text-xs text-[#5F625E]"
            >
              Change Repository URL
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F2F4F0] border border-[#E2E5DE] rounded-[28px] p-6 sm:p-10 max-w-2xl mx-auto shadow-sm space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E2E5DE] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg sm:text-xl font-bold text-[#111111]">
              Evaluating Technical Capabilities
            </h3>
            <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white border border-[#E2E5DE] text-[#163300]">
              {elapsedSeconds}s elapsed
            </span>
          </div>
          <p className="text-xs font-mono text-[#5F625E] truncate max-w-md">Target: {repoUrl}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs font-medium text-[#5F625E]">Verifying</span>
          <p className="text-sm font-bold text-[#163300]">{requirementsCount} Requirements</p>
        </div>
      </div>

      {/* Progress Steps List */}
      <div className="space-y-4">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;

          return (
            <div
              key={step.key}
              className={`p-4 rounded-2xl border transition-all ${
                isCurrent
                  ? 'bg-white border-[#163300] shadow-sm'
                  : isDone
                  ? 'bg-white/60 border-[#E2E5DE]'
                  : 'bg-transparent border-[#E2E5DE]/60 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <div className="w-6 h-6 rounded-full bg-[#163300] text-[#9FE870] flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-6 h-6 rounded-full bg-[#9FE870] text-[#163300] flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-[#163300]" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#E2E5DE] flex items-center justify-center text-[11px] font-bold text-[#5F625E]">
                      {idx + 1}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#111111]">{step.label}</h4>
                    {isCurrent && (
                      <span className="text-[11px] font-bold text-[#163300] animate-pulse">
                        In Progress
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#5F625E] mt-0.5 leading-relaxed">{step.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Status Message & Cancel Action */}
      <div className="pt-2 flex items-center justify-between border-t border-[#E2E5DE] text-xs text-[#5F625E]">
        <div className="flex items-center gap-2 truncate max-w-sm">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#163300] shrink-0" />
          <span className="truncate">{statusMessage || 'Analyzing AST chunks...'}</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="font-bold text-[#163300] hover:underline shrink-0"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AnalysisProgress;
