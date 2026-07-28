import type { HTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export type DividerProps = HTMLAttributes<HTMLHRElement> & {
  orientation?: "horizontal" | "vertical";
};

export default function Divider({
  className,
  orientation = "horizontal",
  ...props
}: DividerProps) {
  return (
    <hr
      aria-orientation={orientation}
      className={cn(
        "shrink-0 border-0 bg-gray-100",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}
