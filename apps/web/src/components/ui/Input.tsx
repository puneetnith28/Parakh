import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string | null;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightElement,
      className = "",
      containerClassName = "",
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className={`w-full space-y-1.5 ${containerClassName}`}>
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-wise-text tracking-tight">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-wise-muted">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-white border text-wise-text placeholder:text-wise-muted/70 text-sm rounded-xl px-4 py-3 transition-colors outline-none ${
              leftIcon ? "pl-10" : ""
            } ${rightElement ? "pr-12" : ""} ${
              error
                ? "border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                : "border-wise-border hover:border-gray-400 focus:border-wise-forest focus:ring-1 focus:ring-wise-forest"
            } ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        {!error && helperText && <p className="text-xs text-wise-muted">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
