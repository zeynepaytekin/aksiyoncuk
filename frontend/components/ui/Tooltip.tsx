"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "@/utils/cn";

export type TooltipProps = {
  children: ReactNode;
  content: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
};

const positionClasses = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "left-1/2 top-full mt-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
};

export default function Tooltip({
  children,
  content,
  position = "top",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className="relative inline-flex"
      aria-describedby={isVisible ? tooltipId : undefined}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setIsVisible(false);
      }}
    >
      {children}
      {isVisible && (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-black px-3 py-2 text-xs text-white shadow-lg",
            positionClasses[position],
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
