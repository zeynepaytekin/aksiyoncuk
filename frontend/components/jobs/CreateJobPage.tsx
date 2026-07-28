"use client";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import JobForm from "@/components/jobs/JobForm";
import { getJobErrorMessage } from "@/services/api/jobErrorMessage";
import { useJobsStore } from "@/store/jobs.store";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function CreateJobPage() {
  const router = useRouter(); useRequireAuth();
  const create = useJobsStore((state) => state.createJob);
  const status = useJobsStore((state) => state.createStatus);
  const error = useJobsStore((state) => state.createError);
  return <AppShell><section className="mx-auto max-w-3xl px-4 py-8"><Card padding="lg">
    <h1 className="mb-6 text-2xl font-bold">Create Job / Project</h1>
    <JobForm saving={status === "loading"} error={error ? getJobErrorMessage(error) : ""}
      onCancel={() => router.push("/profile")} onCreate={async (request) => {
        try { await create(request); router.push("/profile"); } catch { /* store owns safe error */ }
      }} />
  </Card></section></AppShell>;
}
