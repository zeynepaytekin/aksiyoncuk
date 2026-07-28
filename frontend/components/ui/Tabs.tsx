"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "@/utils/cn";

export type TabItem = {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

export type TabsVariant = "underline" | "cards";

export type TabsProps = {
  defaultValue?: string;
  label: string;
  items: TabItem[];
  onValueChange?: (value: string) => void;
  value?: string;
  variant?: TabsVariant;
};

export default function Tabs({
  defaultValue,
  items,
  label,
  onValueChange,
  value,
  variant = "underline",
}: TabsProps) {
  const baseId = useId();
  const firstEnabledItem = items.find((item) => !item.disabled);
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? firstEnabledItem?.id ?? "",
  );
  const selectedValue = value ?? internalValue;
  const selectedItem =
    items.find((item) => item.id === selectedValue && !item.disabled) ??
    firstEnabledItem;

  function selectTab(id: string) {
    if (value === undefined) setInternalValue(id);
    onValueChange?.(id);
  }

  function focusAdjacentTab(currentIndex: number, direction: 1 | -1) {
    for (let offset = 1; offset <= items.length; offset += 1) {
      const index =
        (currentIndex + offset * direction + items.length) % items.length;
      const item = items[index];
      if (item && !item.disabled) {
        document.getElementById(`${baseId}-tab-${item.id}`)?.focus();
        selectTab(item.id);
        return;
      }
    }
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className={cn(
          variant === "underline"
            ? "flex border-b border-gray-200"
            : "grid grid-cols-2 gap-4 md:grid-cols-4",
        )}
      >
        {items.map((item, index) => {
          const isSelected = item.id === selectedItem?.id;

          return (
            <button
              key={item.id}
              id={`${baseId}-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={isSelected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => selectTab(item.id)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  focusAdjacentTab(index, 1);
                } else if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  focusAdjacentTab(index, -1);
                }
              }}
              className={cn(
                "disabled:cursor-not-allowed disabled:opacity-50",
                variant === "underline"
                  ? "border-b-2 px-4 py-3 text-sm font-semibold"
                  : "rounded-2xl border border-gray-200 bg-white p-5 text-sm font-semibold shadow-sm hover:bg-gray-50",
                variant === "underline" &&
                  (isSelected
                    ? "border-black text-black"
                    : "border-transparent text-gray-500"),
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {selectedItem && (
        <div
          id={`${baseId}-panel-${selectedItem.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${selectedItem.id}`}
          tabIndex={0}
        >
          {selectedItem.content}
        </div>
      )}
    </div>
  );
}
