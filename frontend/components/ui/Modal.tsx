"use client";

import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";

import Button from "@/components/ui/Button";
import { cn } from "@/utils/cn";

export type ModalSize = "sm" | "md" | "lg";

export type ModalProps = {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  title: string;
};

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  children,
  description,
  footer,
  isOpen,
  onClose,
  size = "md",
  title,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    const firstFocusable = dialog?.querySelector<HTMLElement>(focusableSelector);
    (firstFocusable ?? dialog)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-2xl bg-white shadow-xl outline-none",
          sizeClasses[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-gray-900">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-gray-500">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="none"
            shape="none"
            onClick={onClose}
            aria-label="Close modal"
            className="px-2 text-xl"
          >
            ×
          </Button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-gray-100 p-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
