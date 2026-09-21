"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { freelanceErrorMessage } from "@/services/api/freelanceErrorMessage";
import { useFreelanceStore } from "@/store/freelance.store";
import FreelanceServiceCard from "./FreelanceServiceCard";

function Content() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, isLoading: authLoading } = useRequireAuth();
  const page = Math.max(0, Number(params.get("page")) || 0);
  const savedServices = useFreelanceStore((state) => state.savedServices);
  const status = useFreelanceStore((state) => state.savedStatus);
  const error = useFreelanceStore((state) => state.savedError);
  const mutations = useFreelanceStore((state) => state.mutations);
  const loadSavedServices = useFreelanceStore((state) => state.loadSavedServices);
  const setServiceSaved = useFreelanceStore((state) => state.setServiceSaved);

  useEffect(() => {
    if (user) void loadSavedServices(page).catch(() => undefined);
  }, [loadSavedServices, page, user]);

  if (authLoading || !user) {
    return <main className="p-8" aria-live="polite">Loading saved services…</main>;
  }

  function go(nextPage: number) {
    router.push(nextPage > 0 ? `/freelance/saved?page=${nextPage}` : "/freelance/saved");
  }

  async function remove(serviceId: string) {
    await setServiceSaved(serviceId, false);
    if (savedServices?.content.length === 1 && page > 0) {
      go(page - 1);
      return;
    }
    await loadSavedServices(page);
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Saved services</h1>
          <p className="mt-2 text-gray-600">
            Your private list of currently published marketplace services.
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push("/freelance")}>
          Browse marketplace
        </Button>
      </header>

      {status === "loading" && !savedServices && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading saved services">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      )}
      {status === "error" && !savedServices && (
        <EmptyState
          title="Unable to load saved services"
          description={freelanceErrorMessage(error)}
          action={<Button onClick={() => void loadSavedServices(page)}>Retry</Button>}
        />
      )}
      {savedServices?.content.length === 0 && (
        <EmptyState
          title="No saved services"
          description="Save published marketplace services to find them here."
        />
      )}
      {savedServices && savedServices.content.length > 0 && (
        <>
          <p aria-live="polite" className="text-sm text-gray-500">
            {savedServices.totalElements} saved service
            {savedServices.totalElements === 1 ? "" : "s"}
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {savedServices.content.map((service) => (
              <FreelanceServiceCard
                key={service.id}
                service={service}
                isSaving={mutations[`saved:${service.id}`] === "loading"}
                onSavedChange={(item) => void remove(item.id).catch(() => undefined)}
              />
            ))}
          </div>
        </>
      )}
      {savedServices && savedServices.totalPages > 1 && (
        <nav aria-label="Saved services pagination" className="flex justify-center gap-3">
          <Button variant="secondary" disabled={savedServices.first} onClick={() => go(page - 1)}>
            Previous
          </Button>
          <span className="self-center text-sm">
            Page {savedServices.page + 1} of {savedServices.totalPages}
          </span>
          <Button variant="secondary" disabled={savedServices.last} onClick={() => go(page + 1)}>
            Next
          </Button>
        </nav>
      )}
    </main>
  );
}

export default function FreelanceSavedServicesPage() {
  return <Suspense><Content /></Suspense>;
}
