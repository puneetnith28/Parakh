import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ArrowLeft, ShieldAlert } from "lucide-react";
import { TactileButton } from "./TactileButton.tsx";

export type AnalysisStep = "validate" | "ingest" | "retrieve" | "evaluate" | "complete";

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
    key: "validate",
    label: "Validating Target Repository",
    detail: "Checking URL integrity, SSRF boundaries, and resolving immutable commit SHA.",
  },
  {
    key: "ingest",
    label: "Scanning Git Tree & Filtering",
    detail: "Traversing repo structure, filtering binaries, vendored code, and build artifacts.",
  },
  {
    key: "retrieve",
    label: "Candidate Evidence Retrieval",
    detail: "Indexing files, extracting AST symbols, and ranking candidate snippets.",
  },
  {
    key: "evaluate",
    label: "Deterministic Citation Validation",
    detail: "Verifying exact line ranges, testing file bounds, and enforcing conservative downgrade rules.",
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

    // Simulate progressive transitions across stages based on elapsed time if backend is asynchronous
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
    if (lower.includes("429") || lower.includes("rate limit") || lower.includes("quota")) {
      return {
        title: "API Rate Limit Reached",
        description: "Public GitHub API or AI model free-tier rate limits were temporarily exceeded.",
        solution: "Wait a brief moment before retrying, or configure a personal access token.",
        isQuota: true,
      };
    }
    if (lower.includes("400") || lower.includes("ssrf") || lower.includes("invalid repository") || lower.includes("not found")) {
      return {
        title: "Invalid or Inaccessible Repository",
        description: "The provided repository URL does not exist, is private, or was blocked by security boundaries.",
        solution: "Ensure the repository is public and accessible at https://github.com/owner/repo.",
        isQuota: false,
      };
    }
    if (lower.includes("503") || lower.includes("500") || lower.includes("unavailable") || lower.includes("timeout")) {
      return {
        title: "Inference Engine Unavailable",
        description: "The AI Studio reasoning model or assessment service failed to respond within the deadline.",
        solution: "Retry the request or verify model availability.",
        isQuota: false,
      };
    }
    return {
      title: "Analysis Interrupted",
      description: msg,
      solution: "Please check your network connection and retry the analysis.",
      isQuota: false,
    };
  };

  if (error) {
    const errDetails = classifyError(error);

    return (
      <div className="bg-slate-900 border border-rose-900/40 rounded-2xl p-6 sm:p-10 max-w-2xl mx-auto shadow-2xl space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">{errDetails.title}</h3>
            <p className="text-xs font-mono text-slate-400">Target: {repoUrl}</p>
          </div>
        </div>

        <div className="bg-rose-950/30 border border-rose-800/30 rounded-xl p-4 space-y-2">
          <p className="text-sm text-rose-200 font-medium">{errDetails.description}</p>
          <p className="text-xs text-rose-300/80">{errDetails.solution}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-800">
          <div className="flex items-center gap-2">
            <TactileButton
              onClick={onRetry}
              variant="primary"
              size="sm"
              rounded={14}
            >
              <RefreshCw className="w-4 h-4 mr-1.5 inline" />
              Retry Analysis
            </TactileButton>
            <TactileButton
              onClick={onCancel}
              variant="secondary"
              size="sm"
              rounded={14}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5 inline" />
              Edit Requirements
            </TactileButton>
          </div>

          {onChangeTarget && (
            <TactileButton
              onClick={onChangeTarget}
              variant="ghost"
              size="sm"
              rounded={12}
            >
              Change Repository URL
            </TactileButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-950/80 border border-red-950/40 backdrop-blur-md rounded-2xl p-6 sm:p-10 max-w-2xl mx-auto shadow-2xl shadow-black/90 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-red-950/40 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg sm:text-xl font-bold text-white">Evaluating Technical Capabilities</h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-rose-400 border border-red-500/30">
              {elapsedSeconds}s elapsed
            </span>
          </div>
          <p className="text-xs font-mono text-neutral-400 truncate max-w-md">Target: {repoUrl}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs font-medium text-neutral-400">Verifying</span>
          <p className="text-sm font-bold text-rose-400">{requirementsCount} Requirements</p>
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
              className={`p-3.5 rounded-xl border transition-all ${
                isCurrent
                  ? "bg-neutral-900/90 border-red-500/50 shadow-md shadow-red-950/40"
                  : isDone
                  ? "bg-neutral-950/40 border-neutral-800/60 opacity-80"
                  : "bg-neutral-950/20 border-neutral-800/30 opacity-40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-rose-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-neutral-700 flex items-center justify-center text-[10px] text-neutral-500">
                      {idx + 1}
                    </div>
                  )}
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${isCurrent ? "text-white" : isDone ? "text-neutral-300" : "text-neutral-500"}`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <span className="text-[10px] font-mono text-rose-400 animate-pulse">Running</span>
                    )}
                    {isDone && (
                      <span className="text-[10px] font-mono text-neutral-400">Complete</span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 line-clamp-1">{step.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live status notice */}
      <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-red-500 animate-spin shrink-0" />
        <p className="text-xs text-neutral-300 font-mono truncate">{statusMessage}</p>
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5 text-neutral-400">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          Deterministic citation verification enforced
        </span>
        <TactileButton
          onClick={onCancel}
          variant="secondary"
          size="sm"
          rounded={12}
        >
          Cancel & Edit
        </TactileButton>
      </div>
    </div>
  );
};
