import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/utils/cn";

export type CardPadding = "none" | "sm" | "md" | "lg";

export type CardElement = "div" | "section" | "article" | "aside";

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: CardElement;
  padding?: CardPadding;
  children: ReactNode;
};

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export default function Card({
  as: Component = "div",
  children,
  className,
  padding = "md",
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        "rounded-2xl border border-gray-200 bg-white shadow-sm",
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
