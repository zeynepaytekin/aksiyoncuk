"use client";
import Link from "next/link";
import { useEffect } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import JobCard from "@/components/jobs/JobCard";
import JobPagination from "@/components/jobs/JobPagination";
import { getJobErrorMessage } from "@/services/api/jobErrorMessage";
import { useJobsStore } from "@/store/jobs.store";

export default function ProfileJobsSection() {
  const jobs = useJobsStore((state) => state.myJobs); const metadata = useJobsStore((state) => state.myPageMetadata);
  const status = useJobsStore((state) => state.myStatus); const error = useJobsStore((state) => state.myError);
  const load = useJobsStore((state) => state.loadMyJobs);
  useEffect(() => { if (status === "idle") void load().catch(() => undefined); }, [load, status]);
  return <Card as="section"><div className="mb-4 flex items-center justify-between">
    <h2 className="text-lg font-bold">Jobs Posted</h2>
    <Link href="/jobs/create" className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">Add Job</Link>
  </div>
  {status === "loading" && jobs.length === 0 && <Skeleton role="status" aria-label="Loading jobs" className="h-48" />}
  {status === "error" && jobs.length === 0 && <EmptyState compact title="Unable to load jobs"
    description={getJobErrorMessage(error)} action={<Button size="sm" onClick={() => void load()}>Try again</Button>} />}
  {status === "loaded" && jobs.length === 0 && <EmptyState compact title="You have not posted any jobs yet." />}
  {jobs.length > 0 && <div className="space-y-4">{jobs.map((job) => <JobCard key={job.id} job={job} ownerControls />)}</div>}
  <JobPagination metadata={metadata} loading={status === "loading"}
    onPage={(page) => void load({ page, size: metadata?.size }).catch(() => undefined)} />
  </Card>;
}
