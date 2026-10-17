import React from 'react';

export type BadgeVariant =
  | 'lime'
  | 'dark'
  | 'surface'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  dotColor?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'surface',
  size = 'md',
  dot = false,
  dotColor,
  icon,
  className = '',
  children,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    lime: 'bg-[#9FE870] text-[#163300] border-transparent font-semibold',
    dark: 'bg-[#163300] text-white border-transparent font-medium',
    surface: 'bg-[#F2F4F0] text-[#111111] border border-[#E2E5DE] font-medium',
    success: 'bg-[#9FE870]/30 text-[#163300] border border-[#9FE870]/60 font-semibold',
    warning: 'bg-amber-100 text-amber-900 border border-amber-300 font-medium',
    error: 'bg-rose-100 text-rose-900 border border-rose-300 font-medium',
    info: 'bg-sky-100 text-sky-900 border border-sky-300 font-medium',
    outline: 'bg-transparent text-[#5F625E] border border-[#E2E5DE] font-medium',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1.5',
    md: 'text-xs px-3 py-1 gap-2',
    lg: 'text-sm px-4 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full tracking-wide transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            dotColor || (variant === 'lime' || variant === 'success' ? 'bg-[#163300]' : 'bg-current')
          }`}
          aria-hidden="true"
        />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export interface StatusBadgeProps {
  status: 'DEMONSTRATED' | 'PARTIALLY_DEMONSTRATED' | 'NOT_DEMONSTRATED' | 'NEEDS_REVIEW' | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const normalized = status.toUpperCase().replace(/\s+/g, '_');

  switch (normalized) {
    case 'DEMONSTRATED':
      return (
        <Badge variant="success" size={size} dot dotColor="bg-[#163300]" className={className}>
          Demonstrated
        </Badge>
      );
    case 'PARTIALLY_DEMONSTRATED':
      return (
        <Badge variant="warning" size={size} dot dotColor="bg-amber-600" className={className}>
          Partially Demonstrated
        </Badge>
      );
    case 'NOT_DEMONSTRATED':
      return (
        <Badge variant="error" size={size} dot dotColor="bg-rose-600" className={className}>
          Not Demonstrated
        </Badge>
      );
    case 'NEEDS_REVIEW':
      return (
        <Badge variant="info" size={size} dot dotColor="bg-sky-600" className={className}>
          Needs Review
        </Badge>
      );
    default:
      return (
        <Badge variant="surface" size={size} className={className}>
          {status}
        </Badge>
      );
  }
};
