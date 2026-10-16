import { useState, useEffect } from "react";
import { X, Check, RotateCcw, ShieldCheck } from "lucide-react";
import { RequirementAssessment, EvidenceStatus } from "@parakh/contracts";
import { StatusBadge } from "./StatusBadge.tsx";

interface UserOverrideProps {
  isOpen: boolean;
  assessment: RequirementAssessment | null;
  onClose: () => void;
  onSave: (updated: RequirementAssessment) => void;
}

const STATUS_OPTIONS: { value: EvidenceStatus; label: string; desc: string }[] = [
  {
    value: "demonstrated",
    label: "Demonstrated",
    desc: "Verified working implementation or test proof exists",
  },
  {
    value: "partially_demonstrated",
    label: "Partially Demonstrated",
    desc: "Baseline code exists but incomplete tests or scope",
  },
  {
    value: "not_demonstrated",
    label: "Not Demonstrated",
    desc: "Capability not present in repository snapshot",
  },
  {
    value: "needs_review",
    label: "Needs Review",
    desc: "Ambiguous references or requires further clarification",
  },
];

export function UserOverride({ isOpen, assessment, onClose, onSave }: UserOverrideProps) {
  const [selectedStatus, setSelectedStatus] = useState<EvidenceStatus>("demonstrated");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (assessment) {
      setSelectedStatus(assessment.status);
      setNotes(assessment.userNotes || "");
    }
  }, [assessment]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !assessment) return null;

  const handleApply = () => {
    const originalStatus = assessment.originalStatus || assessment.status;
    const isOverridden = selectedStatus !== originalStatus || notes.trim().length > 0;

    const updated: RequirementAssessment = {
      ...assessment,
      status: selectedStatus,
      manuallyOverridden: isOverridden,
      originalStatus: isOverridden ? originalStatus : undefined,
      userNotes: notes.trim() || undefined,
    };

    onSave(updated);
    onClose();
  };

  const handleReset = () => {
    if (!assessment.originalStatus) return;

    const updated: RequirementAssessment = {
      ...assessment,
      status: assessment.originalStatus,
      manuallyOverridden: false,
      originalStatus: undefined,
      userNotes: undefined,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800/80 bg-slate-900/90 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {assessment.requirementId}
              </span>
              <span className="text-xs text-slate-400">Manual Verification Control</span>
            </div>
            <h3 className="text-base font-bold text-slate-100 line-clamp-2">
              {assessment.requirementText}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Automated Status */}
        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-slate-500 block mb-1">Automated Model Evaluation:</span>
              <StatusBadge status={assessment.originalStatus || assessment.status} size="sm" />
            </div>
            {assessment.manuallyOverridden && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Currently Overridden
              </span>
            )}
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-200 block">
              Adjust Status Classification:
            </label>
            <div className="space-y-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    selectedStatus === opt.value
                      ? "bg-slate-800/80 border-emerald-500/50 shadow-sm"
                      : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <span className="font-semibold text-slate-200 block">{opt.label}</span>
                    <span className="text-[11px] text-slate-400">{opt.desc}</span>
                  </div>
                  <input
                    type="radio"
                    name="override-status"
                    value={opt.value}
                    checked={selectedStatus === opt.value}
                    onChange={() => setSelectedStatus(opt.value)}
                    className="accent-emerald-500 w-4 h-4"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* User Justification Notes */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200 block">
              Auditor Justification Notes:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Capability demonstrated via live production deployment / client demo..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Advisory Notice */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-950/20 border border-blue-500/20 text-[11px] text-blue-300">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
            <span>
              Overrides update the Evidence Map and are watermarked in the audit report as "Manually Verified by User".
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between gap-2">
          {assessment.manuallyOverridden ? (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 transition text-xs font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Automated</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition text-xs shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Adjustment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
