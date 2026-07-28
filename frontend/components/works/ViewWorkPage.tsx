"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import WorkCard from "@/components/works/WorkCard";
import { ApiError } from "@/services/api/apiClient";
import { worksService } from "@/services/api/works.service";
import { getWorkErrorMessage } from "@/services/api/workErrorMessage";
import type { Work } from "@/types/works";

export default function ViewWorkPage() {
  const workId = useSearchParams().get("id")?.trim() ?? "";
  const [work, setWork] = useState<Work | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(() =>
    workId ? "loading" : "error",
  );
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!workId) return;
    let active = true;
    worksService
      .getById(workId)
      .then((loaded) => {
        if (active) {
          setWork(loaded);
          setStatus("loaded");
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof ApiError
              ? reason
              : new ApiError(0, "NETWORK_ERROR", "Unable to load work."),
          );
          setStatus("error");
        }
      });
    return () => {
      active = false;
    };
  }, [workId]);

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-8">
        {status === "loading" && (
          <Skeleton role="status" aria-label="Loading work" className="h-96" />
        )}
        {status === "error" && (
          <EmptyState
            title={
              error?.code === "WORK_NOT_FOUND"
                ? "Work not found"
                : workId
                  ? "Unable to load work"
                  : "Work ID required"
            }
            description={error ? getWorkErrorMessage(error) : undefined}
          />
        )}
        {work && (
          <Card padding="lg">
            <p className="mb-4 text-sm text-gray-500">
              By {work.owner.fullName} · @{work.owner.username}
              {work.owner.professionalTitle
                ? ` · ${work.owner.professionalTitle}`
                : ""}
            </p>
            <WorkCard work={work} ownerControls={work.ownedByCurrentUser} />
          </Card>
        )}
      </section>
    </AppShell>
  );
}
