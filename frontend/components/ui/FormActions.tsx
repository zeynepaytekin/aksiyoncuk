import type { ReactNode } from "react";

type FormActionsProps = {
  children: ReactNode;
};

export default function FormActions({ children }: FormActionsProps) {
  return <div className="flex justify-end gap-3">{children}</div>;
}
