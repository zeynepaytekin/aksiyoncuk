"use client";

import Link from "next/link";
import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Modal from "@/components/ui/Modal";
import { getJobApplicationErrorMessage } from "@/services/api/jobApplicationErrorMessage";
import { useJobApplicationsStore } from "@/store/jobApplications.store";
import type { JobApplication } from "@/types/jobApplications";
import { formatUtcDate } from "@/utils/formatDate";

type Action = "withdraw" | "accept" | "reject";

export default function ApplicationCard({
  application,
  showJob = true,
  onChanged,
}: {
  application: JobApplication;
  showJob?: boolean;
  onChanged?: (application: JobApplication) => void;
}) {
  const [action, setAction] = useState<Action | null>(null);
  const withdraw = useJobApplicationsStore((state) => state.withdrawApplication);
  const accept = useJobApplicationsStore((state) => state.acceptApplication);
  const reject = useJobApplicationsStore((state) => state.rejectApplication);
  const status = useJobApplicationsStore(
    (state) => state.transitionStatusByApplicationId[application.id] ?? "idle",
  );
  const error = useJobApplicationsStore(
    (state) => state.transitionErrorByApplicationId[application.id],
  );
  const pending = status === "loading";
  const submitted = application.status === "SUBMITTED";

  async function confirm() {
    try {
      let changed: JobApplication | undefined;
      if (action === "withdraw") changed = await withdraw(application.id);
      if (action === "accept") changed = await accept(application.id);
      if (action === "reject") changed = await reject(application.id);
      if (changed) onChanged?.(changed);
      setAction(null);
    } catch {
      // Typed store error remains visible.
    }
  }

  return (
    <article className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          {showJob && <h3 className="font-semibold">{application.job.title}</h3>}
          <p className="text-sm text-gray-600">
            {showJob
              ? `${application.job.owner.fullName} · @${application.job.owner.username}`
              : `${application.applicant.fullName} · @${application.applicant.username}`}
          </p>
          {!showJob && application.applicant.professionalTitle && (
            <p className="text-xs text-gray-500">
              {application.applicant.professionalTitle}
            </p>
          )}
        </div>
        <Badge>{application.status}</Badge>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
        {application.coverLetter ?? "No cover letter provided."}
      </p>
      <div className="mt-3 space-y-1 text-xs text-gray-500">
        <p>Applied {formatUtcDate(application.appliedAt)}</p>
        {application.reviewedAt && <p>Reviewed {formatUtcDate(application.reviewedAt)}</p>}
        {application.withdrawnAt && <p>Withdrawn {formatUtcDate(application.withdrawnAt)}</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link className="text-xs font-medium underline" href={`/applications/view?id=${encodeURIComponent(application.id)}`}>
          View details
        </Link>
        {submitted && application.ownedByCurrentApplicant && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => setAction("withdraw")}>
            Withdraw
          </Button>
        )}
        {submitted && application.manageableByCurrentJobOwner && (
          <>
            <Button size="sm" disabled={pending} onClick={() => setAction("accept")}>Accept</Button>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => setAction("reject")}>Reject</Button>
          </>
        )}
      </div>
      <Modal
        isOpen={action !== null}
        onClose={() => { if (!pending) setAction(null); }}
        title={`${action === "withdraw" ? "Withdraw" : action === "accept" ? "Accept" : "Reject"} application?`}
        description="This state change is recorded by the job application service."
        size="sm"
        footer={<>
          <Button variant="secondary" disabled={pending} onClick={() => setAction(null)}>Cancel</Button>
          <Button isLoading={pending} loadingText="Saving..." onClick={() => void confirm()}>Confirm</Button>
        </>}
      >
        <p className="text-sm text-gray-600">Confirm this application status change.</p>
        {error && <div role="alert" aria-live="polite" className="mt-3">
          <FormError message={getJobApplicationErrorMessage(error)} />
        </div>}
      </Modal>
    </article>
  );
}
