import Link from "next/link";

import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import type { Work } from "@/types/works";

type ProfileWorksSectionProps = {
  works: Work[];
};

export default function ProfileWorksSection({
  works,
}: ProfileWorksSectionProps) {
  return (
    <Card as="section">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Works</h2>
        <Link
          href="/works/create"
          className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Add Work
        </Link>
      </div>

      {works.length === 0 ? (
        <EmptyState compact title="Henüz portfolio işi eklemedin." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {works.map((work) => (
            <div
              key={work.id}
              className="rounded-xl border border-gray-200 p-4"
            >
              <div className="mb-3 h-36 rounded-xl bg-gray-200" />
              <h3 className="font-semibold">{work.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{work.type}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {work.description}
              </p>
              <p className="mt-2 text-xs text-gray-400">{work.createdAt}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
