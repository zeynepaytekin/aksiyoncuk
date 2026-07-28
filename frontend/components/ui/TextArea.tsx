import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export type TextAreaVariant = "default" | "composer";

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  variant?: TextAreaVariant;
  hasError?: boolean;
};

const variantClasses: Record<TextAreaVariant, string> = {
  default:
    "min-h-32 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black",
  composer:
    "mb-3 min-h-24 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-black",
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
