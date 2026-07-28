import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  children: ReactNode;
  htmlFor?: string;
};

export default function FormField({
  children,
  htmlFor,
  label,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
