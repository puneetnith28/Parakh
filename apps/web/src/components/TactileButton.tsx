"use client";

import * as React from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAnimate, useReducedMotion, type Transition } from "motion/react";

const radiusFromPercent = (w: number, h: number, pct: number) =>
  (Math.min(w, h) / 2) * (Math.max(0, Math.min(100, pct)) / 100);

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const DEFAULT_TRANSITION: Transition = {
  type: "spring",
  stiffness: 700,
  damping: 22,
  mass: 0.6,
};

const PRESS_DOWN: Transition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.05,
};

export type IconConfig = {
  type?: "symbol" | "image";
  symbol?: string;
  image?: string | { src?: string; srcSet?: string; alt?: string };
  color?: string;
  hoverColor?: string;
  size?: number;
  padding?: number;
  rounded?: number;
  side?: "left" | "right";
};

type HoverConfig = {
  fill?: string;
  textColor?: string;
};

type BaseConfig = {
  color?: string;
  offsetX?: number;
  offsetY?: number;
  side?: "left" | "right";
  depth?: number;
};

type Colors = {
  fill?: string;
  textColor?: string;
  hoverFill?: string;
  hoverTextColor?: string;
};

export type TactileButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type TactileButtonSize = "sm" | "md" | "lg";

export interface TactileButtonProps {
  label?: string;
  children?: React.ReactNode;
  font?: React.CSSProperties;
  showText?: boolean;
  padding?: string;
  rounded?: number;
  fill?: string;
  textColor?: string;
  colors?: Colors;
  addIcon?: boolean;
  icon?: IconConfig;
  gap?: number;
  border?: React.CSSProperties;
  hover?: HoverConfig;
  base?: BaseConfig;
  shadowColor?: string;
  shadowSide?: "left" | "right";
  shadowDistance?: number;
  link?: string;
  transition?: Transition;
  newTab?: boolean;
  style?: React.CSSProperties;
  className?: string;
  variant?: TactileButtonVariant;
  size?: TactileButtonSize;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
}

export function TactileButton(props: TactileButtonProps) {
  const {
    label,
    children,
    font,
    showText = true,
    padding: paddingProp,
    rounded = 18,
    fill: fillProp,
    textColor: textColorProp,
    colors,
    addIcon = false,
    icon = { side: "left", size: 18, type: "symbol", color: "#FFFFFF", image: "", symbol: "→", padding: 0, rounded: 0, hoverColor: "#FFFFFF" },
    gap = 8,
    border: borderProp,
    hover = {},
    base: baseProp,
    shadowColor: shadowColorLegacy,
    shadowSide: shadowSideLegacy,
    shadowDistance: shadowDistanceLegacy,
    link,
    transition = DEFAULT_TRANSITION,
    newTab = false,
    style,
    className = "",
    variant = "primary",
    size = "md",
    disabled = false,
    type = "button",
    onClick,
  } = props;

  // Variant default mappings tailored to Parakh Crimson & Dark theme
  const variantStyles = {
    primary: {
      fill: "#DC2626", // Crimson Red
      hoverFill: "#EF4444", // Bright Rose Red
      textColor: "#FFFFFF",
      hoverTextColor: "#FFFFFF",
      baseColor: "#7F1D1D", // Deep Crimson 3D Base
      offsetY: 4,
      border: { border: "1px solid rgba(255, 120, 120, 0.35)" },
    },
    secondary: {
      fill: "#121215", // Sleek dark surface
      hoverFill: "#1C1C22",
      textColor: "#E4E4E7",
      hoverTextColor: "#FFFFFF",
      baseColor: "#050507", // Dark base
      offsetY: 3,
      border: { border: "1px solid rgba(255, 60, 60, 0.22)" },
    },
    danger: {
      fill: "#991B1B",
      hoverFill: "#B91C1C",
      textColor: "#FFFFFF",
      hoverTextColor: "#FFFFFF",
      baseColor: "#450A0A",
      offsetY: 4,
      border: { border: "1px solid rgba(239, 68, 68, 0.4)" },
    },
    ghost: {
      fill: "transparent",
      hoverFill: "rgba(255, 0, 0, 0.12)",
      textColor: "#D4D4D8",
      hoverTextColor: "#FFFFFF",
      baseColor: "transparent",
      offsetY: 0,
      border: { border: "1px solid rgba(255, 255, 255, 0.1)" },
    },
  }[variant];

  // Size padding mappings
  const sizePaddings = {
    sm: "6px 14px",
    md: "10px 20px",
    lg: "14px 28px",
  }[size];

  const padding = paddingProp ?? sizePaddings;
  const fill = colors?.fill ?? fillProp ?? variantStyles.fill;
  const textColor = colors?.textColor ?? textColorProp ?? variantStyles.textColor;
  const hoverFill = hover.fill ?? colors?.hoverFill ?? variantStyles.hoverFill;
  const hoverTextColor = hover.textColor ?? colors?.hoverTextColor ?? variantStyles.hoverTextColor;
  const border = borderProp ?? variantStyles.border;

  const baseConfig = baseProp ?? {};
  const baseColor = baseConfig.color ?? shadowColorLegacy ?? variantStyles.baseColor;
  const baseDepth = baseConfig.depth ?? shadowDistanceLegacy ?? variantStyles.offsetY;
  const baseSide = baseConfig.side ?? shadowSideLegacy ?? "right";
  const dx = Math.round(baseConfig.offsetX ?? (baseSide === "left" ? -baseDepth : 0));
  const dy = Math.round(baseConfig.offsetY ?? (baseDepth > 0 ? baseDepth : 0));

  const [scope, animate] = useAnimate();
  const [radiusBox, setRadiusBox] = useState({ w: 0, h: 0 });

  useIsoLayoutEffect(() => {
    const el = scope.current as HTMLElement | null;
    if (!el) return;
    const read = () =>
      setRadiusBox((prev) =>
        prev.w === el.offsetWidth && prev.h === el.offsetHeight
          ? prev
          : { w: el.offsetWidth, h: el.offsetHeight }
      );
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scope]);

  const radiusPx = radiusFromPercent(radiusBox.w, radiusBox.h, rounded);
  const capRef = useRef<any>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const hovered = useRef(false);
  const pressed = useRef(false);
  const reducedMotion = useReducedMotion();

  const fontStyles = (font ?? {}) as React.CSSProperties;

  const {
    type: iconKind = "symbol",
    symbol: iconSymbol = "→",
    image,
    color: iconColor = "#FFFFFF",
    hoverColor: iconHoverColor = "#FFFFFF",
    side: iconSide = "left",
    size: iconSize = 18,
    padding: iconPaddingProp = 0,
    rounded: iconRounded = 0,
  } = icon;

  const iconSrc = typeof image === "string" ? image : image && image.src ? image.src : "";
  const iconMode = iconKind === "image" && iconSrc ? "image" : "symbol";
  const iconPx = Math.max(1, Math.round(iconSize));
  const iconPadPx = Math.max(0, Math.round(iconPaddingProp));
  const iconRadius = radiusFromPercent(iconPx, iconPx, iconRounded);
  const gapPx = Math.max(0, Math.round(gap));

  const iconEl = !addIcon ? null : iconMode === "image" ? (
    <img
      src={iconSrc}
      alt=""
      aria-hidden
      draggable={false}
      style={{
        width: iconPx,
        height: iconPx,
        margin: iconPadPx,
        objectFit: iconRadius > 0 ? "cover" : "contain",
        borderRadius: Math.min(iconRadius, iconPx / 2),
        display: "block",
        flex: "none",
        pointerEvents: "none",
      }}
    />
  ) : (
    <span
      ref={iconRef}
      aria-hidden
      style={{
        fontSize: iconPx,
        margin: iconPadPx,
        lineHeight: 1,
        color: iconColor,
        flex: "none",
        pointerEvents: "none",
      }}
    >
      {iconSymbol}
    </span>
  );

  const paint = useCallback(
    (toHover: boolean, instant: boolean) => {
      const el = capRef.current;
      if (!el) return;
      const t: Transition = instant || reducedMotion ? { duration: 0 } : transition;
      animate(
        el,
        toHover
          ? {
              backgroundColor: hoverFill,
              color: hoverTextColor,
            }
          : {
              backgroundColor: fill,
              color: textColor,
            },
        t as any
      );
      if (iconRef.current) {
        animate(iconRef.current, { color: toHover ? iconHoverColor : iconColor }, t as any);
      }
    },
    [animate, transition, reducedMotion, fill, hoverFill, textColor, hoverTextColor, iconColor, iconHoverColor]
  );

  const press = useCallback(
    (down: boolean, instant: boolean) => {
      const el = capRef.current;
      if (!el || disabled) return;
      const t: Transition = instant
        ? { duration: 0 }
        : reducedMotion
        ? { duration: 0 }
        : down
        ? PRESS_DOWN
        : transition;
      animate(el, { x: down ? dx : 0, y: down ? dy : 0 }, t as any);
    },
    [animate, transition, reducedMotion, dx, dy, disabled]
  );

  useEffect(() => {
    paint(hovered.current, true);
  }, [paint]);

  useEffect(() => {
    press(pressed.current, true);
  }, [press]);

  const onEnter = () => {
    if (disabled) return;
    hovered.current = true;
    paint(true, false);
  };

  const onLeave = () => {
    hovered.current = false;
    paint(false, false);
    if (pressed.current) {
      pressed.current = false;
      press(false, false);
    }
  };

  const onDown = () => {
    if (disabled) return;
    pressed.current = true;
    press(true, false);
  };

  const onUp = () => {
    if (disabled) return;
    pressed.current = false;
    press(false, false);
  };

  useEffect(() => {
    const release = () => {
      if (!pressed.current) return;
      pressed.current = false;
      press(false, false);
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [press]);

  const isLink = typeof link === "string" && link.length > 0;
  const Tag: any = isLink ? "a" : "button";
  const tagProps = {
    "aria-label": showText ? undefined : label || undefined,
    disabled: !isLink ? disabled : undefined,
    onClick: disabled ? undefined : onClick,
    ...(isLink
      ? {
          href: link,
          target: newTab ? "_blank" : undefined,
          rel: newTab ? "noopener noreferrer" : undefined,
        }
      : { type }),
  };

  return (
    <div
      className={className}
      style={{
        display: "inline-block",
        boxSizing: "border-box",
        paddingTop: Math.max(0, -dy),
        paddingBottom: Math.max(0, dy),
        paddingLeft: Math.max(0, -dx),
        paddingRight: Math.max(0, dx),
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      <div
        ref={scope}
        style={{
          position: "relative",
          display: "inline-flex",
          width: "100%",
          height: "100%",
        }}
      >
        {/* 3D Tactile Base Shadow */}
        {dy > 0 && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              transform: `translate(${dx}px, ${dy}px)`,
              borderRadius: radiusPx,
              ...(border ?? {}),
              backgroundColor: baseColor,
              boxSizing: "border-box",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Tactile Cap */}
        <Tag
          {...tagProps}
          ref={capRef}
          onPointerEnter={onEnter}
          onPointerLeave={onLeave}
          onPointerDown={onDown}
          onPointerUp={onUp}
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding,
            borderRadius: radiusPx,
            ...(border ?? {}),
            backgroundColor: fill,
            textDecoration: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            boxSizing: "border-box",
            userSelect: "none",
            whiteSpace: "nowrap",
            textAlign: "center",
            WebkitTapHighlightColor: "transparent",
            ...fontStyles,
            color: textColor,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: (iconEl && (showText || children)) ? gapPx : 0,
              flexDirection: iconSide === "right" ? "row-reverse" : "row",
            }}
          >
            {iconEl}
            {children ? children : showText && label ? <span>{label}</span> : null}
          </span>
        </Tag>
      </div>
    </div>
  );
}

export default TactileButton;
