"use client";

import Link from "next/link";
import { useState } from "react";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Modal from "@/components/ui/Modal";
import TextArea from "@/components/ui/TextArea";
import { getJobApplicationErrorMessage } from "@/services/api/jobApplicationErrorMessage";
import { useAuthStore } from "@/store/auth.store";
import { useJobApplicationsStore } from "@/store/jobApplications.store";
import type { Job } from "@/types/jobs";

export default function ApplyToJob({
  job,
  onApplied,
}: {
  job: Job;
  onApplied?: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const apply = useJobApplicationsStore((state) => state.applyToJob);
  const status = useJobApplicationsStore(
    (state) => state.applyStatusByJobId[job.id] ?? "idle",
  );
  const error = useJobApplicationsStore(
    (state) => state.applyErrorByJobId[job.id],
  );
  const pending = status === "loading";

  if (!user) {
    return (
      <Link className="font-medium underline" href="/login">
        Sign in to apply
      </Link>
    );
  }
  if (job.ownedByCurrentUser) {
    return <p className="text-sm text-gray-500">This is your listing.</p>;
  }
  if (job.status === "CLOSED") {
    return <p className="text-sm font-medium text-gray-500">Applications are closed.</p>;
  }
  if (submitted) {
    return (
      <p role="status" className="text-sm font-medium text-green-700">
        Application submitted.
      </p>
    );
  }

  async function submit() {
    const normalized = coverLetter.trim();
    if (normalized.length > 5000) return;
    try {
      await apply(job.id, normalized || null);
      onApplied?.();
      setCoverLetter("");
      setSubmitted(true);
      setOpen(false);
    } catch {
      // The typed store error is rendered in the modal.
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Apply</Button>
      <Modal
        isOpen={open}
        onClose={() => { if (!pending) setOpen(false); }}
        title={`Apply to ${job.title}`}
        description="A cover letter is optional."
        footer={
          <>
            <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              isLoading={pending}
              loadingText="Submitting..."
              disabled={coverLetter.length > 5000}
              onClick={() => void submit()}
            >
              Submit application
            </Button>
          </>
        }
      >
        <label htmlFor={`cover-letter-${job.id}`} className="text-sm font-medium">
          Cover letter
        </label>
        <TextArea
          id={`cover-letter-${job.id}`}
          value={coverLetter}
          maxLength={5000}
          rows={8}
          onChange={(event) => setCoverLetter(event.target.value)}
        />
        <p className="mt-1 text-right text-xs text-gray-500">
          {coverLetter.length}/5000
        </p>
        {error && (
          <div role="alert" aria-live="polite" className="mt-3">
            <FormError message={getJobApplicationErrorMessage(error)} />
          </div>
        )}
      </Modal>
    </>
  );
}
