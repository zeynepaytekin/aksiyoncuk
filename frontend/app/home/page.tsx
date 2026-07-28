"use client";

import Feed from "@/components/feed/Feed";
import AppShell from "@/components/layout/AppShell";
import LeftSidebar from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function HomePage() {
  const { isLoading, user } = useRequireAuth();

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Checking session...</p>
      </main>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <LeftSidebar />
        </div>

        <div className="lg:col-span-6">
          <Feed />
        </div>

        <div className="lg:col-span-3">
          <RightSidebar />
        </div>
      </div>
    </AppShell>
  );
}
