import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export type InputVariant = "default" | "subtle" | "auth";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  variant?: InputVariant;
  hasError?: boolean;
};

const variantClasses: Record<InputVariant, string> = {
  default:
    "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black",
  subtle:
    "flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black",
  auth:
    "w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black",
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
