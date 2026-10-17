import React from "react";

export interface StepItem {
  id: string;
  label: string;
}

export interface NavProgressProps {
  steps: StepItem[];
  currentStepId: string;
  className?: string;
  onStepClick?: (id: string) => void;
}

export const NavProgress: React.FC<NavProgressProps> = ({
  steps,
  currentStepId,
  className = "",
  onStepClick,
}) => {
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === currentStepId)
  );
  const progressPercent = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className={`w-full max-w-xl mx-auto space-y-2 ${className}`}>
      {/* Progress Track */}
      <div className="relative h-1 w-full bg-[#E2E5DE] rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-wise-forest transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step Labels */}
      <div className="flex items-center justify-between text-xs">
        {steps.map((step, idx) => {
          const isCurrent = step.id === currentStepId;
          const isPast = idx < currentIndex;
          return (
            <button
              key={step.id}
              type="button"
              disabled={!onStepClick || (!isPast && !isCurrent)}
              onClick={() => onStepClick?.(step.id)}
              className={`transition-colors font-sans ${
                isCurrent
                  ? "font-bold text-wise-forest underline underline-offset-4 decoration-2 decoration-wise-forest"
                  : isPast
                  ? "font-medium text-wise-text hover:text-wise-forest cursor-pointer"
                  : "font-normal text-wise-muted cursor-default"
              }`}
            >
              {step.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NavProgress;
