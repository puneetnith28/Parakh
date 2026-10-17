import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string | null;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      className = "",
      containerClassName = "",
      id,
      rows = 6,
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
        <textarea
          id={inputId}
          ref={ref}
          rows={rows}
          className={`w-full bg-white border text-wise-text placeholder:text-wise-muted/70 text-sm rounded-xl p-4 transition-colors outline-none font-sans resize-y ${
            error
              ? "border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-600"
              : "border-wise-border hover:border-gray-400 focus:border-wise-forest focus:ring-1 focus:ring-wise-forest"
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        {!error && helperText && <p className="text-xs text-wise-muted">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
export default Textarea;
