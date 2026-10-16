import { CheckCircle2, AlertTriangle, HelpCircle, AlertCircle } from "lucide-react";
import { EvidenceStatus } from "@parakh/contracts";

interface StatusBadgeProps {
  status: EvidenceStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, size = "md", className = "", showIcon = true }: StatusBadgeProps) {
  const config = {
    demonstrated: {
      label: "Demonstrated",
      icon: CheckCircle2,
      style: "bg-emerald-950/60 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50",
      iconColor: "text-emerald-400",
    },
    partially_demonstrated: {
      label: "Partially Demonstrated",
      icon: AlertTriangle,
      style: "bg-amber-950/60 text-amber-300 border-amber-500/30 hover:border-amber-500/50",
      iconColor: "text-amber-400",
    },
    not_demonstrated: {
      label: "Not Demonstrated",
      icon: HelpCircle,
      style: "bg-slate-900/80 text-slate-400 border-slate-700/50 hover:border-slate-600",
      iconColor: "text-slate-400",
    },
    needs_review: {
      label: "Needs Review",
      icon: AlertCircle,
      style: "bg-indigo-950/60 text-indigo-300 border-indigo-500/30 hover:border-indigo-500/50",
      iconColor: "text-indigo-400",
    },
  }[status] || {
    label: status,
    icon: HelpCircle,
    style: "bg-slate-900/80 text-slate-400 border-slate-700/50",
    iconColor: "text-slate-400",
  };

  const IconComponent = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-colors shadow-sm ${config.style} ${sizeClasses} ${className}`}
      title={status === "not_demonstrated" ? "No evidence found in repository snapshot" : config.label}
    >
      {showIcon && <IconComponent className={size === "sm" ? "w-3 h-3" : size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5"} />}
      <span>{config.label}</span>
    </span>
  );
}
