import React from 'react';

export interface SelectionCardProps {
  id?: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
  className?: string;
}

export const SelectionCard: React.FC<SelectionCardProps> = ({
  id,
  title,
  description,
  icon,
  selected = false,
  onClick,
  disabled = false,
  badge,
  className = '',
}) => {
  return (
    <button
      id={id}
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={`relative flex flex-col items-center justify-between text-center p-8 sm:p-10 rounded-[28px] transition-all duration-200 outline-none w-full min-h-[300px] ${
        selected
          ? 'bg-[#EAECE7] ring-2 ring-[#163300] shadow-sm'
          : 'bg-[#F2F4F0] hover:bg-[#EAECE7] border border-transparent'
      } ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:-translate-y-0.5'
      } focus-visible:ring-2 focus-visible:ring-[#163300] focus-visible:ring-offset-2 ${className}`}
    >
      {badge && (
        <span className="absolute top-4 right-4 bg-[#9FE870] text-[#163300] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
          {badge}
        </span>
      )}

      {/* Artwork / Icon Container */}
      <div className="w-32 h-32 flex items-center justify-center my-auto">
        {icon}
      </div>

      {/* Text Info */}
      <div className="mt-4 flex flex-col items-center">
        <h3 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
          {title}
        </h3>
        <p className="mt-2 text-sm text-[#5F625E] leading-relaxed max-w-[280px]">
          {description}
        </p>
      </div>
    </button>
  );
};
