"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import ApplicationCard from "@/components/jobs/ApplicationCard";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ApiError } from "@/services/api/apiClient";
import { jobApplicationsService } from "@/services/api/jobApplications.service";
import { getJobApplicationErrorMessage } from "@/services/api/jobApplicationErrorMessage";
import type { JobApplication } from "@/types/jobApplications";

export default function ViewApplicationPage() {
  const id = useSearchParams().get("id")?.trim() ?? "";
  const { user, isLoading } = useRequireAuth();
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  useEffect(() => {
    if (!id || !user || isLoading) return;
    let active = true;
    jobApplicationsService.getById(id)
      .then((value) => { if (active) setApplication(value); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof ApiError
          ? reason : new ApiError(0, "NETWORK_ERROR", "Unable to load application."));
      });
    return () => { active = false; };
  }, [id, isLoading, user]);
  return <AppShell><section className="mx-auto max-w-3xl px-4 py-8">
    {!id && <EmptyState title="Application ID required" />}
    {id && !application && !error && <Skeleton role="status" aria-label="Loading application" className="h-72" />}
    {error && <EmptyState
      title={error.code === "JOB_APPLICATION_NOT_FOUND" ? "Application not found"
        : error.code.includes("FORBIDDEN") ? "Access denied" : "Unable to load application"}
      description={getJobApplicationErrorMessage(error)} />}
    {application && <ApplicationCard application={application} onChanged={setApplication} />}
  </section></AppShell>;
}
