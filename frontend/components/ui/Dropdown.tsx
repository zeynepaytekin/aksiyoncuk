"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/utils/cn";

export type DropdownItem = {
  id: string;
  label: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
};

export type DropdownProps = {
  align?: "left" | "right";
  className?: string;
  disabled?: boolean;
  items: DropdownItem[];
  label: string;
  trigger: ReactNode;
};

export default function Dropdown({
  align = "left",
  className,
  disabled = false,
  items,
  label,
  trigger,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function focusItem(startIndex: number, direction: 1 | -1) {
    for (let offset = 0; offset < items.length; offset += 1) {
      const index = (startIndex + offset * direction + items.length) % items.length;
      if (!items[index]?.disabled) {
        itemRefs.current[index]?.focus();
        return;
      }
    }
  }

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            requestAnimationFrame(() => focusItem(0, 1));
          }
        }}
        className="disabled:cursor-not-allowed disabled:opacity-50"
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={cn(
            "absolute z-50 mt-2 min-w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              tabIndex={index === 0 ? 0 : -1}
              onClick={() => {
                item.onSelect();
                setIsOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  focusItem(index + 1, 1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  focusItem(index - 1, -1);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  focusItem(0, 1);
                } else if (event.key === "End") {
                  event.preventDefault();
                  focusItem(items.length - 1, -1);
                }
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
