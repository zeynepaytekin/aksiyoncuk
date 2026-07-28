import type { HTMLAttributes, ImgHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

export type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
  src?: string;
  imageProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, "alt" | "src">;
};

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-20 w-20 text-lg",
  xl: "h-28 w-28 text-xl",
};

export default function Avatar({
  alt = "",
  className,
  fallback,
  imageProps,
  size = "md",
  src,
  ...props
}: AvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 font-semibold text-gray-600",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {src ? (
        // Native images keep this primitive independent of deployment image rules.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          {...imageProps}
        />
      ) : (
        <span aria-hidden={!fallback}>{fallback}</span>
      )}
    </div>
  );
}
