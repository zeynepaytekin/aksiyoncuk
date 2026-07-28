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

type Props = {
  work: Work;
  ownerControls?: boolean;
};

export default function WorkCard({ work, ownerControls = false }: Props) {
  const [confirming, setConfirming] = useState(false);
  const deleteWork = useWorksStore((state) => state.deleteWork);
  const status = useWorksStore(
    (state) => state.deleteStatusById[work.id] ?? "idle",
  );
  const error = useWorksStore(
    (state) => state.deleteErrorById[work.id] ?? null,
  );

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
      <div className="mb-3 h-36 rounded-xl bg-gray-200" aria-hidden="true" />
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
}
