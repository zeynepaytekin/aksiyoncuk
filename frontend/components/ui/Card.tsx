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
        "rounded-[1.35rem] border border-[#d9d1c3] bg-[#fffdf8] shadow-[0_2px_0_rgba(25,24,21,0.04)] transition duration-200 hover:border-[#aaa194]",
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
