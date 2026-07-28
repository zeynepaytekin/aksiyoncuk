import type { HTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export type BadgeVariant = "neutral" | "dark" | "outline";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-gray-100 text-gray-700",
  dark: "bg-black text-white",
  outline: "border border-gray-300 text-gray-700",
};

export default function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
