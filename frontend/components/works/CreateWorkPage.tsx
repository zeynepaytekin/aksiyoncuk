"use client";

import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import WorkForm from "@/components/works/WorkForm";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getWorkErrorMessage } from "@/services/api/workErrorMessage";
import { useWorksStore } from "@/store/works.store";
import type { CreateWorkRequest } from "@/types/works";

export default function CreateWorkPage() {
  const router = useRouter();
  const { isLoading: isAuthLoading, user } = useRequireAuth();
  const createWork = useWorksStore((state) => state.createWork);
  const status = useWorksStore((state) => state.createStatus);
  const error = useWorksStore((state) => state.createError);

  async function create(request: CreateWorkRequest) {
    if (!user) return;
    try {
      await createWork(request);
      router.push("/profile");
    } catch {
      // The form remains populated and the store exposes the safe error.
    }
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-8">
        <Card padding="lg">
          <h1 className="mb-6 text-2xl font-bold">Add Work</h1>
          {!isAuthLoading && user && (
            <WorkForm
              isSaving={status === "loading"}
              error={error ? getWorkErrorMessage(error) : ""}
              onCancel={() => router.push("/profile")}
              onCreate={create}
            />
          )}
          {isAuthLoading && (
            <p role="status" className="text-sm text-gray-500">
              Loading…
            </p>
          )}
        </Card>
      </section>
    </AppShell>
  );
}
