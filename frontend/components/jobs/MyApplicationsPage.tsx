"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import ApplicationCard from "@/components/jobs/ApplicationCard";
import ApplicationPagination from "@/components/jobs/ApplicationPagination";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { getJobApplicationErrorMessage } from "@/services/api/jobApplicationErrorMessage";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useJobApplicationsStore } from "@/store/jobApplications.store";
import {
  JOB_APPLICATION_STATUS_VALUES,
  type JobApplicationStatus,
} from "@/types/jobApplications";

export default function MyApplicationsPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const [filter, setFilter] = useState<JobApplicationStatus | undefined>();
  const applications = useJobApplicationsStore((state) => state.myApplications);
  const metadata = useJobApplicationsStore((state) => state.myPageMetadata);
  const status = useJobApplicationsStore((state) => state.myStatus);
  const error = useJobApplicationsStore((state) => state.myError);
  const load = useJobApplicationsStore((state) => state.loadMyApplications);

  useEffect(() => {
    if (!authLoading && user && status === "idle") {
      void load({ page: 0, status: filter }).catch(() => undefined);
    }
  }, [authLoading, filter, load, status, user]);

  function change(value: string) {
    setFilter((value || undefined) as JobApplicationStatus | undefined);
    useJobApplicationsStore.setState({ myStatus: "idle", myPageMetadata: null });
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">My Applications</h1>
        <label className="mt-5 block max-w-xs text-sm font-medium">
          Application status
          <select
            aria-label="Application status filter"
            value={filter ?? ""}
            onChange={(event) => change(event.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          >
            <option value="">All statuses</option>
            {JOB_APPLICATION_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <div className="mt-6 space-y-4">
          {(authLoading || status === "loading") && applications.length === 0 && (
            <Skeleton role="status" aria-label="Loading applications" className="h-48" />
          )}
          {status === "error" && applications.length === 0 && (
            <EmptyState title="Unable to load applications"
              description={getJobApplicationErrorMessage(error)}
              action={<Button onClick={() => void load({ page: 0, status: filter })}>Try again</Button>} />
          )}
          {status === "loaded" && applications.length === 0 && (
            <EmptyState title="No applications found." />
          )}
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
        <ApplicationPagination metadata={metadata} loading={status === "loading"}
          onPage={(page) => void load({ page, size: metadata?.size, status: filter }).catch(() => undefined)} />
      </section>
    </AppShell>
  );
}
