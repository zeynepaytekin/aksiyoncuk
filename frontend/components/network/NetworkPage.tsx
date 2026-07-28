"use client";

import Link from "next/link";
import { useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getNetworkErrorMessage } from "@/services/api/networkErrorMessage";
import { useNetworkStore } from "@/store/network.store";

export default function NetworkPage() {
  const { user, isLoading } = useRequireAuth();
  const summary = useNetworkStore((state) => state.summary);
  const status = useNetworkStore((state) => state.summaryStatus);
  const error = useNetworkStore((state) => state.summaryError);
  const load = useNetworkStore((state) => state.loadMySummary);
  useEffect(() => {
    if (!isLoading && user && status === "idle") void load().catch(() => undefined);
  }, [isLoading, load, status, user]);
  return <AppShell><section className="mx-auto max-w-4xl px-4 py-8">
    <h1 className="text-2xl font-bold">My Network</h1>
    {(isLoading || status === "loading") && !summary &&
      <Skeleton role="status" aria-label="Loading network summary" className="mt-6 h-40" />}
    {status === "error" && !summary && <EmptyState title="Unable to load network"
      description={getNetworkErrorMessage(error)} action={<Button onClick={() => void load()}>Try again</Button>} />}
    {summary && user && <div className="mt-6 grid gap-4 sm:grid-cols-3">
      <Link href={`/network/followers?username=${encodeURIComponent(user.username)}`}>
        <Card className="text-center"><p className="text-3xl font-bold">{summary.followerCount}</p>
          <p className="text-sm text-gray-500">Followers</p></Card>
      </Link>
      <Link href={`/network/following?username=${encodeURIComponent(user.username)}`}>
        <Card className="text-center"><p className="text-3xl font-bold">{summary.followingCount}</p>
          <p className="text-sm text-gray-500">Following</p></Card>
      </Link>
      <Card className="text-center"><p className="text-3xl font-bold">{summary.mutualCount}</p>
        <p className="text-sm text-gray-500">Mutuals</p></Card>
    </div>}
  </section></AppShell>;
}
