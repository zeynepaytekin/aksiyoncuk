import Link from "next/link";

import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import type { Job } from "@/types/jobs";

type ProfileJobsSectionProps = {
  jobs: Job[];
};

export default function ProfileJobsSection({
  jobs,
}: ProfileJobsSectionProps) {
  return (
    <Card as="section">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Jobs Posted</h2>
        <Link
          href="/jobs/create"
          className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Add Job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <EmptyState compact title="Henüz iş/proje ilanı eklemedin." />
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-xl border border-gray-200 p-4"
            >
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{job.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {job.category} · {job.location}
                  </p>
                </div>

                <Badge>Open</Badge>
              </div>

              <p className="text-sm leading-6 text-gray-600">
                {job.description}
              </p>
              <p className="mt-2 text-xs text-gray-400">{job.createdAt}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
