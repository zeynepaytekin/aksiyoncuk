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
  primary: "bg-black text-white hover:opacity-90",
  secondary:
    "border border-gray-300 text-gray-700 hover:bg-gray-50",
  soft: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  ghost: "text-gray-500 hover:text-black",
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
        "disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
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
