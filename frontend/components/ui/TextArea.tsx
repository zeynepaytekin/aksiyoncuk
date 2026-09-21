import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export type TextAreaVariant = "default" | "composer";

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  variant?: TextAreaVariant;
  hasError?: boolean;
};

const variantClasses: Record<TextAreaVariant, string> = {
  default:
    "min-h-32 w-full resize-none rounded-xl border border-[#cfc6b8] bg-[#fffdf8] px-4 py-3 text-sm outline-none focus:border-[#191815] focus:shadow-[2px_2px_0_#f7e98b]",
  composer:
    "mb-3 min-h-24 w-full resize-none rounded-xl border-0 bg-[#f7f1e7] p-4 text-sm outline-none placeholder:text-[#8e877c] focus:ring-1 focus:ring-[#191815]",
};

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
    { className, disabled, hasError = false, variant = "default", ...props },
    ref,
  ) {
    return (
      <textarea
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
  },
);

export default TextArea;
