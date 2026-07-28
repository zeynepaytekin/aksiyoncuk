"use client";

import Link from "next/link";
import { useEffect } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import WorkCard from "@/components/works/WorkCard";
import WorkPagination from "@/components/works/WorkPagination";
import { getWorkErrorMessage } from "@/services/api/workErrorMessage";
import { useWorksStore } from "@/store/works.store";

export default function ProfileWorksSection() {
  const works = useWorksStore((state) => state.myWorks);
  const metadata = useWorksStore((state) => state.myPageMetadata);
  const status = useWorksStore((state) => state.myStatus);
  const error = useWorksStore((state) => state.myError);
  const loadWorks = useWorksStore((state) => state.loadMyWorks);

  useEffect(() => {
    if (status === "idle") void loadWorks().catch(() => undefined);
  }, [loadWorks, status]);

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
      {status === "loading" && works.length === 0 && (
        <div role="status" aria-label="Loading works" className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      )}
      {status === "error" && works.length === 0 && (
        <EmptyState
          compact
          title="Unable to load works"
          description={getWorkErrorMessage(error)}
          action={
            <Button size="sm" onClick={() => void loadWorks()}>
              Try again
            </Button>
          }
        />
      )}
      {status === "loaded" && works.length === 0 && (
        <EmptyState compact title="You have not added any portfolio works yet." />
      )}
      {works.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {works.map((work) => (
            <WorkCard key={work.id} work={work} ownerControls />
          ))}
        </div>
      )}
      <WorkPagination
        metadata={metadata}
        isLoading={status === "loading"}
        onPageChange={(page) =>
          void loadWorks({ page, size: metadata?.size }).catch(() => undefined)
        }
      />
    </Card>
  );
}
