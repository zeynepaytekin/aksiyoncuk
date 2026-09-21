"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/utils/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "soft"
  | "ghost"
  | "unstyled";
export type ButtonSize = "sm" | "md" | "lg" | "auth" | "none";
export type ButtonShape = "rounded" | "pill" | "none";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  isLoading?: boolean;
  loadingText?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border border-[#191815] bg-[#191815] text-white shadow-[2px_2px_0_#f5a56f] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#f5a56f] active:translate-y-0 active:shadow-none",
  secondary:
    "border border-[#bdb4a6] bg-[#fffdf8] text-[#302d28] hover:border-[#191815] hover:bg-[#f7e98b]",
  soft: "border border-[#f3c5a4] bg-[#fbd8bf] text-[#302d28] hover:bg-[#f5c49f]",
  ghost: "text-[#706b62] hover:bg-[#f7e98b]/50 hover:text-[#191815]",
  unstyled: "",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1 text-xs font-medium",
  md: "px-4 py-2 text-sm font-semibold",
  lg: "px-5 py-3 text-sm font-semibold",
  auth: "px-4 py-3 text-sm font-semibold",
  none: "",
};

const shapeClasses: Record<ButtonShape, string> = {
  rounded: "rounded-xl",
  pill: "rounded-full",
  none: "",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    disabled,
    endIcon,
    isLoading = false,
    loadingText,
    shape = "rounded",
    size = "md",
    startIcon,
    type = "button",
    variant = "primary",
    ...props
  },
  ref,
) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#191815]",
        variantClasses[variant],
        sizeClasses[size],
        shapeClasses[shape],
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
          {loadingText ?? children}
        </span>
      ) : (
        <>
          {startIcon}
          {children}
          {endIcon}
        </>
      )}
    </button>
  );
});

export default Button;
