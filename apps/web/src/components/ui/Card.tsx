import React, { forwardRef } from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'white' | 'surface' | 'dark' | 'lime' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hoverable?: boolean;
  selected?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'white',
      padding = 'lg',
      hoverable = false,
      selected = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      white: 'bg-white text-[#111111] border border-[#E2E5DE] shadow-sm',
      surface: 'bg-[#F2F4F0] text-[#111111] border border-transparent',
      dark: 'bg-[#163300] text-white border border-[#234E05]',
      lime: 'bg-[#9FE870] text-[#163300] border border-[#8EE05B]',
      outline: 'bg-transparent text-[#111111] border-2 border-[#E2E5DE]',
    };

    const paddingStyles = {
      none: '',
      sm: 'p-3 sm:p-4',
      md: 'p-4 sm:p-6',
      lg: 'p-6 sm:p-8',
      xl: 'p-8 sm:p-10',
    };

    const hoverStyles = hoverable
      ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer'
      : '';

    const selectedStyles = selected
      ? 'ring-2 ring-[#163300] border-[#163300]'
      : '';

    return (
      <div
        ref={ref}
        className={`rounded-3xl ${variantStyles[variant]} ${paddingStyles[padding]} ${hoverStyles} ${selectedStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
