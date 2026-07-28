import type { HTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export type SpinnerSize = "sm" | "md" | "lg";

export type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  label?: string;
  size?: SpinnerSize;
};

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-4",
};

export default function Spinner({
  className,
  label = "Loading",
  size = "md",
  ...props
}: SpinnerProps) {
  return (
    <span role="status" className={cn("inline-flex", className)} {...props}>
      <span
        aria-hidden="true"
        className={cn(
          "animate-spin rounded-full border-current border-r-transparent",
          sizeClasses[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
