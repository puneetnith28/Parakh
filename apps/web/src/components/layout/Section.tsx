import React from "react";
import { Container } from "./Container";

export type SectionVariant = "white" | "lime" | "forest" | "surface";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: SectionVariant;
  spacing?: "none" | "compact" | "default" | "spacious";
  containerSize?: "narrow" | "default" | "wide" | "full";
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  variant = "white",
  spacing = "default",
  containerSize = "default",
  className = "",
  containerClassName = "",
  children,
  ...props
}) => {
  const variantStyles = {
    white: "bg-white text-wise-text",
    lime: "bg-wise-lime text-wise-forest selection:bg-wise-forest selection:text-wise-lime",
    forest: "bg-wise-forest text-white selection:bg-wise-lime selection:text-wise-forest",
    surface: "bg-wise-surface text-wise-text",
  }[variant];

  const spacingStyles = {
    none: "",
    compact: "py-8 sm:py-12",
    default: "py-16 sm:py-24",
    spacious: "py-24 sm:py-32",
  }[spacing];

  return (
    <section className={`w-full ${variantStyles} ${spacingStyles} ${className}`} {...props}>
      <Container size={containerSize} className={containerClassName}>
        {children}
      </Container>
    </section>
  );
};

export default Section;
