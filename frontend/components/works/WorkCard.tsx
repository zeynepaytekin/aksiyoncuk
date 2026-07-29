"use client";

import Link from "next/link";
import { useState } from "react";

import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Modal from "@/components/ui/Modal";
import { getWorkTypeLabel } from "@/constants/works";
import { getWorkErrorMessage } from "@/services/api/workErrorMessage";
import { useWorksStore } from "@/store/works.store";
import type { Work } from "@/types/works";
import { formatUtcDate } from "@/utils/formatDate";
import MediaGallery from "@/components/media/MediaGallery";
import { mediaService } from "@/services/api/media.service";
import { worksService } from "@/services/api/works.service";
import { getMediaErrorMessage } from "@/services/api/mediaErrorMessage";
import ExistingMediaUpload from "@/components/media/ExistingMediaUpload";

type Props = {
  work: Work;
  ownerControls?: boolean;
};

export default function WorkCard({ work, ownerControls = false }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const deleteWork = useWorksStore((state) => state.deleteWork);
  const syncWork = useWorksStore((state) => state.syncWork);
  const status = useWorksStore(
    (state) => state.deleteStatusById[work.id] ?? "idle",
  );
  const error = useWorksStore(
    (state) => state.deleteErrorById[work.id] ?? null,
  );
  const media = work.media ?? [];

  async function handleDelete() {
    try {
      await deleteWork(work.id);
      setConfirming(false);
    } catch {
      // The store exposes a safe typed error while the dialog remains open.
    }
  }

  const canManage = ownerControls && work.ownedByCurrentUser;
  return (
    <article className="rounded-xl border border-gray-200 p-4">
      {media.length ? (
        <MediaGallery media={[...media].sort((a, b) => a.displayOrder - b.displayOrder).slice(0, 1)}
          alt={work.title} compact />
      ) : <div className="mb-3 h-36 rounded-xl bg-gray-200" aria-hidden="true" />}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{work.title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {getWorkTypeLabel(work.workType)}
            {work.releaseYear ? ` · ${work.releaseYear}` : ""}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-1">
            <Link
              href={`/works/edit?id=${encodeURIComponent(work.id)}`}
              className="rounded-xl px-3 py-1 text-xs font-medium text-gray-500 hover:text-black"
            >
              Edit
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(true)}
            >
              Delete
            </Button>
          </div>
        )}
      </div>
      {work.description && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
          {work.description}
        </p>
      )}
      {work.projectUrl && (
        <a
          href={work.projectUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2 inline-block text-sm font-medium underline"
        >
          Open project website
        </a>
      )}
      {media.length > 1 && <MediaGallery media={media.slice(1)} alt={work.title} compact />}
      {canManage && media.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Manage work images">
          {media.map((item, index) => (
            <span key={item.id} className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" disabled={mediaBusy || index === 0}
                aria-label="Move image left" onClick={() => void changeOrder(index, -1)}>←</Button>
              <Button type="button" variant="ghost" size="sm" disabled={mediaBusy || index === media.length - 1}
                aria-label="Move image right" onClick={() => void changeOrder(index, 1)}>→</Button>
              <Button type="button" variant="ghost" size="sm" disabled={mediaBusy}
                aria-label={`Delete image ${index + 1}`} onClick={() => {
                  if (!window.confirm("Delete this image?")) return;
                  void (async () => { setMediaBusy(true); setMediaError("");
                    try { await mediaService.deleteWorkImage(work.id, item.id); syncWork(await worksService.getById(work.id)); }
                    catch (reason) { setMediaError(getMediaErrorMessage(reason)); } finally { setMediaBusy(false); }
                  })();
                }}>Delete image</Button>
            </span>
          ))}
        </div>
      )}
      {mediaError && <div role="alert"><FormError message={mediaError} /></div>}
      {canManage && (
        <ExistingMediaUpload purpose="work" remaining={12 - media.length}
          upload={async (file) => {
            await mediaService.uploadWorkImage(work.id, file);
            syncWork(await worksService.getById(work.id));
          }} />
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        <time className="text-xs text-gray-400" dateTime={work.createdAt}>
          {formatUtcDate(work.createdAt)}
        </time>
        <Link
          href={`/works/view?id=${encodeURIComponent(work.id)}`}
          className="text-xs font-medium text-gray-600 underline"
        >
          View details
        </Link>
      </div>

      <Modal
        isOpen={confirming}
        onClose={() => {
          if (status !== "loading") setConfirming(false);
        }}
        title="Delete work?"
        description="This action cannot be undone."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={status === "loading"}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
            <Button
              isLoading={status === "loading"}
              loadingText="Deleting..."
              onClick={() => void handleDelete()}
            >
              Delete work
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          “{work.title}” will be permanently removed.
        </p>
        {error && (
          <div className="mt-3" role="status" aria-live="polite">
            <FormError message={getWorkErrorMessage(error)} />
          </div>
        )}
      </Modal>
    </article>
  );

  async function changeOrder(index: number, delta: number) {
    const ids = media.map(({ id }) => id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    setMediaBusy(true); setMediaError("");
    try { await mediaService.reorderWorkImages(work.id, ids); syncWork(await worksService.getById(work.id)); }
    catch (reason) { setMediaError(getMediaErrorMessage(reason)); }
    finally { setMediaBusy(false); }
  }
}
