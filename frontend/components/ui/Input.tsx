import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export type InputVariant = "default" | "subtle" | "auth";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  variant?: InputVariant;
  hasError?: boolean;
};

const variantClasses: Record<InputVariant, string> = {
  default:
    "w-full rounded-xl border border-[#cfc6b8] bg-[#fffdf8] px-4 py-3 text-sm outline-none placeholder:text-[#9a9388] focus:border-[#191815] focus:shadow-[2px_2px_0_#f7e98b]",
  subtle:
    "flex-1 rounded-xl border border-[#d9d1c3] bg-[#fffdf8] px-3 py-2 text-sm outline-none focus:border-[#191815]",
  auth:
    "w-full rounded-xl border border-[#cfc6b8] bg-[#fffdf8] px-4 py-3 outline-none transition placeholder:text-[#9a9388] focus:border-[#191815] focus:shadow-[3px_3px_0_#f7e98b]",
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, disabled, hasError = false, variant = "default", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      disabled={disabled}
      aria-invalid={hasError || undefined}
      className={cn(
        variantClasses[variant],
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

export default Input;
