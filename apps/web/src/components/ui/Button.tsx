import React from "react";

export type ButtonVariant = "primary" | "dark" | "lime" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      pill = true,
      fullWidth = false,
      icon,
      iconPosition = "left",
      isLoading = false,
      disabled = false,
      className = "",
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      primary:
        "bg-[#163300] hover:bg-[#245305] text-white shadow-sm active:translate-y-0.5 focus-visible:ring-[#9FE870] font-bold",
      dark:
        "bg-[#163300] hover:bg-[#245305] text-white shadow-sm active:translate-y-0.5 focus-visible:ring-[#9FE870] font-bold",
      lime:
        "bg-[#9FE870] hover:bg-[#8edb5f] text-[#163300] shadow-sm active:translate-y-0.5 focus-visible:ring-[#163300] font-bold",
      secondary:
        "bg-white hover:bg-[#F2F4F0] text-[#163300] border-2 border-[#163300]/25 hover:border-[#163300] shadow-xs active:translate-y-0.5 font-bold",
      outline:
        "bg-white hover:bg-[#F2F4F0] text-[#163300] border-2 border-[#163300] shadow-xs active:translate-y-0.5 font-bold",
      ghost:
        "bg-[#EAECE7] hover:bg-[#DFE2DB] text-[#163300] border border-[#CBD0C5] active:translate-y-0.5 font-semibold",
    }[variant];

    const sizeStyles = {
      sm: "px-4 py-1.5 text-xs font-semibold tracking-tight gap-1.5",
      md: "px-6 py-2.5 text-sm font-bold tracking-tight gap-2",
      lg: "px-8 py-3.5 text-base font-extrabold tracking-tight gap-2.5",
    }[size];

    const shapeStyle = pill ? "rounded-full" : "rounded-2xl";
    const widthStyle = fullWidth ? "w-full" : "";
    const stateStyle = disabled || isLoading ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer";

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-sans transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${shapeStyle} ${variantStyles} ${sizeStyles} ${widthStyle} ${stateStyle} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {!isLoading && icon && iconPosition === "left" && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
        {!isLoading && icon && iconPosition === "right" && <span className="shrink-0">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
