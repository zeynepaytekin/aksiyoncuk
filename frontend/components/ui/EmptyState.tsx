import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

export type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
};

export default function EmptyState({
  action,
  className,
  compact = false,
  description,
  icon,
  title,
}: EmptyStateProps) {
  if (compact) {
    return <p className={cn("text-sm text-gray-500", className)}>{title}</p>;
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center",
        className,
      )}
    >
      {icon && <div className="mb-3 text-gray-400">{icon}</div>}
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-gray-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
