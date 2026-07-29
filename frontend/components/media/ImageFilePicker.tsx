"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import { ACCEPTED_IMAGE_TYPES, MEDIA_LIMITS, validateImageFile } from "@/services/media/mediaValidation";
import type { MediaUploadPurpose } from "@/types/media";

type Props = {
  purpose: MediaUploadPurpose;
  files: File[];
  onChange: (files: File[]) => void;
  maximum?: number;
  disabled?: boolean;
};
export default function ImageFilePicker({
  purpose, files, onChange, maximum = 1, disabled = false,
}: Props) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const previews = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );
  useEffect(
    () => () => previews.forEach((url) => URL.revokeObjectURL(url)),
    [previews],
  );

  function add(selected: FileList | null) {
    if (!selected) return;
    setError("");
    const next = maximum === 1 ? [] : [...files];
    for (const file of Array.from(selected)) {
      if (next.length >= maximum) {
        setError(`You can select up to ${maximum} image${maximum === 1 ? "" : "s"}.`);
        break;
      }
      const validation = validateImageFile(file, purpose);
      if (!validation.valid) {
        setError(`${file.name}: ${validation.message}`);
        continue;
      }
      next.push(file);
    }
    if ((maximum === 1 && next.length > 0) || next.length !== files.length) {
      onChange(maximum === 1 ? next.slice(-1) : next);
    }
    if (input.current) input.current.value = "";
  }

  return (
    <div className="space-y-3">
      <div
        className="rounded-xl border-2 border-dashed border-gray-300 p-4 text-center focus-within:border-black"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); if (!disabled) add(event.dataTransfer.files); }}
      >
        <input
          ref={input}
          id={inputId}
          className="sr-only"
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          multiple={maximum > 1}
          disabled={disabled}
          onChange={(event) => add(event.target.files)}
          aria-invalid={Boolean(error)}
          aria-describedby={`${inputId}-help`}
        />
        <label htmlFor={inputId} className="cursor-pointer text-sm font-semibold underline">
          Choose image{maximum > 1 ? "s" : ""}
        </label>
        <p id={`${inputId}-help`} className="mt-1 text-xs text-gray-500">
          JPEG, PNG or WebP · up to {MEDIA_LIMITS[purpose] / 1024 / 1024} MB each
        </p>
      </div>
      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {previews.map((url, index) => (
            <div key={url} className="relative overflow-hidden rounded-xl border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Selected image ${index + 1}`} className="h-28 w-full object-cover" />
              <Button type="button" variant="secondary" size="sm"
                className="absolute right-1 top-1" disabled={disabled}
                onClick={() => onChange(files.filter((_, item) => item !== index))}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
      {error && <div role="alert"><FormError message={error} /></div>}
    </div>
  );
}
