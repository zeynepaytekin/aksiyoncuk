import type { HTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export type BadgeVariant = "neutral" | "dark" | "outline";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "border border-[#e8b58f] bg-[#fbd8bf] text-[#4d3323]",
  dark: "bg-[#191815] text-white",
  outline: "border border-[#bdb4a6] bg-[#fffdf8] text-[#4c4841]",
};

export default function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
