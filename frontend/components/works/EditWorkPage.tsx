"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import WorkForm from "@/components/works/WorkForm";
import { ApiError } from "@/services/api/apiClient";
import { worksService } from "@/services/api/works.service";
import { getWorkErrorMessage } from "@/services/api/workErrorMessage";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useWorksStore } from "@/store/works.store";
import type { UpdateWorkRequest, Work } from "@/types/works";

export default function EditWorkPage() {
  const router = useRouter();
  const search = useSearchParams();
  const workId = search.get("id")?.trim() ?? "";
  const { isLoading: isAuthLoading, user } = useRequireAuth();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const updateWork = useWorksStore((state) => state.updateWork);
  const updateStatus = useWorksStore(
    (state) => state.updateStatusById[workId] ?? "idle",
  );
  const updateError = useWorksStore(
    (state) => state.updateErrorById[workId] ?? null,
  );

  useEffect(() => {
    if (isAuthLoading || !user) return;
    if (!workId) return;
    let active = true;
    worksService
      .getById(workId)
      .then((loaded) => {
        if (!active) return;
        setWork(loaded);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (active)
          setLoadError(
            error instanceof ApiError
              ? error
              : new ApiError(0, "NETWORK_ERROR", "Unable to load work."),
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthLoading, user, workId]);

  async function update(request: UpdateWorkRequest) {
    if (Object.keys(request).length === 0) {
      router.push("/profile");
      return;
    }
    try {
      await updateWork(workId, request);
      router.push("/profile");
    } catch {
      // The store exposes the safe error and the form remains populated.
    }
  }

  let content;
  if (isAuthLoading || (workId && loading)) {
    content = <Skeleton role="status" aria-label="Loading work" className="h-96" />;
  } else if (!workId) {
    content = <EmptyState title="Work ID required" />;
  } else if (loadError) {
    content = (
      <EmptyState
        title={
          loadError.code === "WORK_NOT_FOUND"
            ? "Work not found"
            : "Unable to load work"
        }
        description={getWorkErrorMessage(loadError)}
      />
    );
  } else if (work && !work.ownedByCurrentUser) {
    content = (
      <EmptyState
        title="You cannot edit this work"
        description="Only the work owner can make changes."
      />
    );
  } else if (work) {
    content = (
      <Card padding="lg">
        <h1 className="mb-6 text-2xl font-bold">Edit Work</h1>
        <WorkForm
          initial={work}
          isSaving={updateStatus === "loading"}
          error={updateError ? getWorkErrorMessage(updateError) : ""}
          onCancel={() => router.push("/profile")}
          onUpdate={update}
        />
      </Card>
    );
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-8">{content}</section>
    </AppShell>
  );
}
