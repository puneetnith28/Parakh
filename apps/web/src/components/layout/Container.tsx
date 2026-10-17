import React from "react";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "narrow" | "default" | "wide" | "full";
  className?: string;
  children: React.ReactNode;
}

export const Container: React.FC<ContainerProps> = ({
  size = "default",
  className = "",
  children,
  ...props
}) => {
  const sizeClasses = {
    narrow: "max-w-4xl",
    default: "max-w-6xl",
    wide: "max-w-7xl",
    full: "max-w-full",
  }[size];

  return (
    <div
      className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${sizeClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Container;
