"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import ApplicationCard from "@/components/jobs/ApplicationCard";
import ApplicationPagination from "@/components/jobs/ApplicationPagination";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getJobApplicationErrorMessage } from "@/services/api/jobApplicationErrorMessage";
import { useJobApplicationsStore } from "@/store/jobApplications.store";
import {
  JOB_APPLICATION_STATUS_VALUES,
  type JobApplicationStatus,
} from "@/types/jobApplications";

export default function JobApplicantsPage() {
  const jobId = useSearchParams().get("jobId")?.trim() ?? "";
  const { user, isLoading: authLoading } = useRequireAuth();
  const [filter, setFilter] = useState<JobApplicationStatus | undefined>();
  const applications = useJobApplicationsStore((state) => state.applicationsByJobId[jobId] ?? []);
  const metadata = useJobApplicationsStore((state) => state.pageMetadataByJobId[jobId] ?? null);
  const status = useJobApplicationsStore((state) => state.statusByJobId[jobId] ?? "idle");
  const error = useJobApplicationsStore((state) => state.errorByJobId[jobId]);
  const load = useJobApplicationsStore((state) => state.loadApplicationsForJob);

  useEffect(() => {
    if (jobId && !authLoading && user && status === "idle") {
      void load(jobId, { page: 0, status: filter }).catch(() => undefined);
    }
  }, [authLoading, filter, jobId, load, status, user]);

  function change(value: string) {
    setFilter((value || undefined) as JobApplicationStatus | undefined);
    useJobApplicationsStore.setState((state) => ({
      statusByJobId: { ...state.statusByJobId, [jobId]: "idle" },
    }));
  }

  return <AppShell><section className="mx-auto max-w-4xl px-4 py-8">
    <h1 className="text-2xl font-bold">Job Applicants</h1>
    {!jobId && <EmptyState title="Job ID required" />}
    {jobId && <label className="mt-5 block max-w-xs text-sm font-medium">Application status
      <select aria-label="Applicant status filter" value={filter ?? ""}
        onChange={(event) => change(event.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2">
        <option value="">All statuses</option>
        {JOB_APPLICATION_STATUS_VALUES.map((value) => <option key={value}>{value}</option>)}
      </select>
    </label>}
    <div className="mt-6 space-y-4">
      {(authLoading || status === "loading") && applications.length === 0 &&
        <Skeleton role="status" aria-label="Loading applicants" className="h-48" />}
      {status === "error" && applications.length === 0 &&
        <EmptyState title={error?.code === "JOB_APPLICATIONS_VIEW_FORBIDDEN" ? "Access denied" : "Unable to load applicants"}
          description={getJobApplicationErrorMessage(error)}
          action={<Button onClick={() => void load(jobId, { page: 0, status: filter })}>Try again</Button>} />}
      {status === "loaded" && applications.length === 0 && <EmptyState title="No applications found." />}
      {applications.map((application) =>
        <ApplicationCard key={application.id} application={application} showJob={false} />)}
    </div>
    <ApplicationPagination metadata={metadata} loading={status === "loading"}
      onPage={(page) => void load(jobId, { page, size: metadata?.size, status: filter }).catch(() => undefined)} />
  </section></AppShell>;
}
