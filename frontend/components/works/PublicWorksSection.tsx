"use client";

import { useEffect } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import WorkCard from "@/components/works/WorkCard";
import WorkPagination from "@/components/works/WorkPagination";
import { getWorkErrorMessage } from "@/services/api/workErrorMessage";
import {
  normalizeWorkUsername,
  useWorksStore,
} from "@/store/works.store";

export default function PublicWorksSection({ username }: { username: string }) {
  const key = normalizeWorkUsername(username);
  const works = useWorksStore(
    (state) => state.publicWorksByUsername[key] ?? [],
  );
  const metadata = useWorksStore(
    (state) => state.publicPageMetadataByUsername[key],
  );
  const status = useWorksStore(
    (state) => state.publicStatusByUsername[key] ?? "idle",
  );
  const error = useWorksStore(
    (state) => state.publicErrorByUsername[key] ?? null,
  );
  const loadWorks = useWorksStore((state) => state.loadPublicWorks);

  useEffect(() => {
    if (key && status === "idle") {
      void loadWorks(key).catch(() => undefined);
    }
  }, [key, loadWorks, status]);

  return (
    <Card as="section" className="lg:col-span-8">
      <h2 className="mb-4 text-lg font-bold">Works</h2>
      {status === "loading" && works.length === 0 && (
        <Skeleton role="status" aria-label="Loading public works" className="h-64" />
      )}
      {status === "error" && works.length === 0 && (
        <EmptyState
          compact
          title="Unable to load works"
          description={getWorkErrorMessage(error)}
          action={
            <Button size="sm" onClick={() => void loadWorks(key)}>
              Try again
            </Button>
          }
        />
      )}
      {status === "loaded" && works.length === 0 && (
        <EmptyState compact title="No public works yet." />
      )}
      {works.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {works.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>
      )}
      <WorkPagination
        metadata={metadata}
        isLoading={status === "loading"}
        onPageChange={(page) =>
          void loadWorks(key, { page, size: metadata?.size }).catch(
            () => undefined,
          )
        }
      />
    </Card>
  );
}
