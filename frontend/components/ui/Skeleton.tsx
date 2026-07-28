import type { HTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  shape?: "rectangle" | "circle" | "text";
};

const shapeClasses = {
  rectangle: "rounded-xl",
  circle: "rounded-full",
  text: "h-4 rounded",
};

export default function Skeleton({
  className,
  shape = "rectangle",
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-gray-200",
        shapeClasses[shape],
        className,
      )}
      {...props}
    />
  );
}
