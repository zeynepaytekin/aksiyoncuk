"use client";
import Link from "next/link";
import { useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import JobCard from "@/components/jobs/JobCard";
import JobPagination from "@/components/jobs/JobPagination";
import { JOB_CATEGORIES, JOB_STATUSES, WORK_MODES } from "@/constants/jobs";
import { getJobErrorMessage } from "@/services/api/jobErrorMessage";
import { useAuthStore } from "@/store/auth.store";
import { useJobsStore } from "@/store/jobs.store";
import type { JobCategory, JobStatus, WorkMode } from "@/types/jobs";

export default function JobsPage() {
  const user = useAuthStore((state) => state.user);
  const jobs = useJobsStore((state) => state.globalJobs); const status = useJobsStore((state) => state.globalStatus);
  const error = useJobsStore((state) => state.globalError); const metadata = useJobsStore((state) => state.globalPageMetadata);
  const filters = useJobsStore((state) => state.filters); const setFilters = useJobsStore((state) => state.setFilters);
  const load = useJobsStore((state) => state.loadGlobalJobs);
  useEffect(() => { if (status === "idle") void load({ page: 0 }).catch(() => undefined); }, [load, status]);
  function change(next: typeof filters) { setFilters(next); }
  return <AppShell><section className="mx-auto max-w-6xl px-4 py-8">
    <div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-bold">Jobs / Project Board</h1>
      <p className="text-sm text-gray-500">Find open creative projects and opportunities.</p></div>
      {user ? <Link href="/jobs/create" className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">Create Job</Link>
        : <Link href="/login" className="rounded-full border px-4 py-2 text-sm font-semibold">Sign in to post</Link>}
    </div>
    <Card><div className="grid gap-4 md:grid-cols-3">
      <label className="text-sm font-medium">Status<select aria-label="Status filter" value={filters.status ?? ""}
        onChange={(e) => change({ ...filters, status: (e.target.value || undefined) as JobStatus | undefined })}
        className="mt-1 w-full rounded-xl border px-3 py-2"><option value="">All</option>
        {JOB_STATUSES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
      <label className="text-sm font-medium">Category<select aria-label="Category filter" value={filters.category ?? ""}
        onChange={(e) => change({ ...filters, category: (e.target.value || undefined) as JobCategory | undefined })}
        className="mt-1 w-full rounded-xl border px-3 py-2"><option value="">All</option>
        {JOB_CATEGORIES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
      <label className="text-sm font-medium">Work mode<select aria-label="Work mode filter" value={filters.workMode ?? ""}
        onChange={(e) => change({ ...filters, workMode: (e.target.value || undefined) as WorkMode | undefined })}
        className="mt-1 w-full rounded-xl border px-3 py-2"><option value="">All</option>
        {WORK_MODES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
    </div></Card>
    <div className="mt-6 space-y-4">
      {status === "loading" && jobs.length === 0 && <><Skeleton aria-label="Loading jobs" className="h-52" /><Skeleton className="h-52" /></>}
      {status === "error" && jobs.length === 0 && <EmptyState title="Unable to load jobs"
        description={getJobErrorMessage(error)} action={<Button onClick={() => void load({ page: 0 })}>Try again</Button>} />}
      {status === "loaded" && jobs.length === 0 && <EmptyState title="No listings match these filters." />}
      {jobs.map((job) => <JobCard key={job.id} job={job} ownerControls={job.ownedByCurrentUser} />)}
    </div>
    <JobPagination metadata={metadata} loading={status === "loading"}
      onPage={(page) => void load({ page, size: metadata?.size }).catch(() => undefined)} />
  </section></AppShell>;
}
