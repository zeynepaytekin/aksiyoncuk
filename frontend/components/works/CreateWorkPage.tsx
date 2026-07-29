"use client";

import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import WorkForm from "@/components/works/WorkForm";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getWorkErrorMessage } from "@/services/api/workErrorMessage";
import { useWorksStore } from "@/store/works.store";
import type { CreateWorkRequest } from "@/types/works";
import ImageFilePicker from "@/components/media/ImageFilePicker";
import FormError from "@/components/ui/FormError";
import { mediaService } from "@/services/api/media.service";
import { getMediaErrorMessage } from "@/services/api/mediaErrorMessage";
import { worksService } from "@/services/api/works.service";
import { useState } from "react";

export default function CreateWorkPage() {
  const router = useRouter();
  const { isLoading: isAuthLoading, user } = useRequireAuth();
  const createWork = useWorksStore((state) => state.createWork);
  const status = useWorksStore((state) => state.createStatus);
  const error = useWorksStore((state) => state.createError);
  const syncWork = useWorksStore((state) => state.syncWork);
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [createdWorkId, setCreatedWorkId] = useState("");
  const [mediaMessage, setMediaMessage] = useState("");

  async function create(request: CreateWorkRequest) {
    if (!user) return;
    try {
      const work = createdWorkId ? null : await createWork(request);
      const workId = createdWorkId || work!.id;
      setCreatedWorkId(workId);
      setUploading(true);
      const failed: File[] = [];
      for (const image of images) {
        try { await mediaService.uploadWorkImage(workId, image); }
        catch { failed.push(image); }
      }
      syncWork(await worksService.getById(workId));
      setImages(failed);
      if (failed.length) {
        setMediaMessage(`Work saved. ${failed.length} image(s) failed; submit again to retry them.`);
      } else {
        router.push("/profile");
      }
    } catch (reason) {
      if (createdWorkId) setMediaMessage(getMediaErrorMessage(reason));
      // The form remains populated and the store exposes the safe error.
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-8">
        <Card padding="lg">
          <h1 className="mb-6 text-2xl font-bold">Add Work</h1>
          {!isAuthLoading && user && (
            <>
              <div className="mb-5">
                <ImageFilePicker purpose="work" maximum={12} files={images}
                  onChange={setImages} disabled={status === "loading" || uploading} />
              </div>
              {mediaMessage && <div className="mb-4" role="status" aria-live="polite"><FormError message={mediaMessage} /></div>}
              <WorkForm
                isSaving={status === "loading" || uploading}
                error={error ? getWorkErrorMessage(error) : ""}
                onCancel={() => router.push("/profile")}
                onCreate={create}
              />
            </>
          )}
          {isAuthLoading && (
            <p role="status" className="text-sm text-gray-500">
              Loading…
            </p>
          )}
        </Card>
      </section>
    </AppShell>
  );
}
