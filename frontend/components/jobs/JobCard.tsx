"use client";
import Link from "next/link";
import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Modal from "@/components/ui/Modal";
import { enumLabel } from "@/constants/jobs";
import { getJobErrorMessage } from "@/services/api/jobErrorMessage";
import { useJobsStore } from "@/store/jobs.store";
import type { Job } from "@/types/jobs";
import { formatUtcDate } from "@/utils/formatDate";
import { formatJobCompensation } from "@/utils/formatCompensation";

export default function JobCard({ job, ownerControls = false }: { job: Job; ownerControls?: boolean }) {
  const [action, setAction] = useState<"close" | "reopen" | "delete" | null>(null);
  const close = useJobsStore((state) => state.closeJob); const reopen = useJobsStore((state) => state.reopenJob);
  const remove = useJobsStore((state) => state.deleteJob);
  const transitionStatus = useJobsStore((state) => state.transitionStatusById[job.id] ?? "idle");
  const transitionError = useJobsStore((state) => state.transitionErrorById[job.id]);
  const deleteStatus = useJobsStore((state) => state.deleteStatusById[job.id] ?? "idle");
  const deleteError = useJobsStore((state) => state.deleteErrorById[job.id]);
  const pending = transitionStatus === "loading" || deleteStatus === "loading";
  const canManage = ownerControls && job.ownedByCurrentUser;
  async function confirm() {
    try {
      if (action === "close") await close(job.id);
      if (action === "reopen") await reopen(job.id);
      if (action === "delete") await remove(job.id);
      setAction(null);
    } catch { /* safe store error is rendered */ }
  }
  return <article className="rounded-xl border border-gray-200 p-4">
    <div className="flex items-start justify-between gap-3"><div>
      <h3 className="font-semibold text-gray-900">{job.title}</h3>
      <p className="text-sm text-gray-500">{job.owner.fullName} · @{job.owner.username}</p>
    </div><Badge>{enumLabel(job.status)}</Badge></div>
    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">{job.description}</p>
    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
      <div><dt className="sr-only">Category</dt><dd>{enumLabel(job.category)}</dd></div>
      <div><dt className="sr-only">Work mode</dt><dd>{enumLabel(job.workMode)}</dd></div>
      <div><dt className="sr-only">Location</dt><dd>{job.location ?? "Location flexible"}</dd></div>
      <div><dt className="sr-only">Compensation</dt><dd>{formatJobCompensation(job)}</dd></div>
    </dl>
    {job.applicationDeadline && <p className="mt-2 text-xs text-gray-500">Apply by {formatUtcDate(job.applicationDeadline)}</p>}
    <p className="mt-2 text-xs font-medium text-gray-500">Applications ({job.applicationCount})</p>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <time dateTime={job.createdAt} className="text-xs text-gray-400">{formatUtcDate(job.createdAt)}</time>
      <div className="flex gap-2"><Link className="text-xs font-medium underline" href={`/jobs/view?id=${encodeURIComponent(job.id)}`}>View details</Link>
      {canManage && <><Link className="text-xs font-medium underline" href={`/jobs/edit?id=${encodeURIComponent(job.id)}`}>Edit</Link>
        {job.applicationCount > 0 && <Link className="text-xs font-medium underline"
          href={`/jobs/applicants?jobId=${encodeURIComponent(job.id)}`}>View Applicants</Link>}
        <Button size="sm" variant="secondary" disabled={pending}
          onClick={() => setAction(job.status === "OPEN" ? "close" : "reopen")}>
          {job.status === "OPEN" ? "Close" : "Reopen"}</Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setAction("delete")}>Delete</Button></>}</div>
    </div>
    <Modal isOpen={action !== null} onClose={() => { if (!pending) setAction(null); }}
      title={action === "delete" ? "Delete job?" : `${action === "close" ? "Close" : "Reopen"} job?`}
      description="Confirm this listing change." size="sm" footer={<>
        <Button variant="secondary" disabled={pending} onClick={() => setAction(null)}>Cancel</Button>
        <Button isLoading={pending} loadingText="Saving..." onClick={() => void confirm()}>Confirm</Button>
      </>}>
      <p className="text-sm text-gray-600">“{job.title}” will be {action === "delete" ? "permanently deleted" : action === "close" ? "closed" : "reopened"}.</p>
      {(transitionError || deleteError) && <div role="status" aria-live="polite" className="mt-3">
        <FormError message={getJobErrorMessage(transitionError ?? deleteError)} /></div>}
    </Modal>
  </article>;
}
