"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import ImageFilePicker from "./ImageFilePicker";
import { getMediaErrorMessage } from "@/services/api/mediaErrorMessage";
import type { MediaUploadPurpose } from "@/types/media";

type Props = {
  purpose: Extract<MediaUploadPurpose, "post" | "work">;
  remaining: number;
  upload: (file: File) => Promise<void>;
};
export default function ExistingMediaUpload({ purpose, remaining, upload }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (remaining <= 0) return null;
  async function submit() {
    if (!files.length || busy) return;
    setBusy(true); setError("");
    const failed: File[] = [];
    for (const file of files) {
      try { await upload(file); } catch (reason) {
        failed.push(file); setError(getMediaErrorMessage(reason));
      }
    }
    setFiles(failed); setBusy(false);
  }
  return (
    <div className="mt-3 space-y-2">
      <ImageFilePicker purpose={purpose} maximum={remaining} files={files} onChange={setFiles} disabled={busy} />
      <Button type="button" size="sm" disabled={!files.length || busy} isLoading={busy}
        loadingText="Uploading..." onClick={() => void submit()}>Add images</Button>
      {error && <div role="alert"><FormError message={error} /></div>}
    </div>
  );
}
