"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import NetworkPagination from "@/components/network/NetworkPagination";
import NetworkUserCard from "@/components/network/NetworkUserCard";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { getNetworkErrorMessage } from "@/services/api/networkErrorMessage";
import { normalizeNetworkUsername } from "@/services/api/network.service";
import { useNetworkStore } from "@/store/network.store";
import type { NetworkUser } from "@/types/network";

const EMPTY_NETWORK_USERS: NetworkUser[] = [];

export default function NetworkListPage({ kind }: { kind: "followers" | "following" }) {
  const username = normalizeNetworkUsername(useSearchParams().get("username") ?? "");
  const followers = useNetworkStore(
    (state) => state.followersByUsername[username] ?? EMPTY_NETWORK_USERS,
  );
  const following = useNetworkStore(
    (state) => state.followingByUsername[username] ?? EMPTY_NETWORK_USERS,
  );
  const followerMeta = useNetworkStore((state) => state.followerPageMetadataByUsername[username] ?? null);
  const followingMeta = useNetworkStore((state) => state.followingPageMetadataByUsername[username] ?? null);
  const followerStatus = useNetworkStore((state) => state.followerStatusByUsername[username] ?? "idle");
  const followingStatus = useNetworkStore((state) => state.followingStatusByUsername[username] ?? "idle");
  const followerError = useNetworkStore((state) => state.followerErrorByUsername[username]);
  const followingError = useNetworkStore((state) => state.followingErrorByUsername[username]);
  const loadFollowers = useNetworkStore((state) => state.loadFollowers);
  const loadFollowing = useNetworkStore((state) => state.loadFollowing);
  const values = kind === "followers" ? followers : following;
  const metadata = kind === "followers" ? followerMeta : followingMeta;
  const status = kind === "followers" ? followerStatus : followingStatus;
  const error = kind === "followers" ? followerError : followingError;
  const load = kind === "followers" ? loadFollowers : loadFollowing;

  useEffect(() => {
    if (username && status === "idle") {
      void load(username, { page: 0 }).catch(() => undefined);
    }
  }, [load, status, username]);

  return <AppShell><section className="mx-auto max-w-3xl px-4 py-8">
    <h1 className="text-2xl font-bold">{kind === "followers" ? "Followers" : "Following"}</h1>
    <p className="text-sm text-gray-500">Network for @{username}</p>
    {!username && <EmptyState title="Profile username required" />}
    <div className="mt-6 space-y-3">
      {status === "loading" && values.length === 0 &&
        <Skeleton role="status" aria-label={`Loading ${kind}`} className="h-40" />}
      {status === "error" && values.length === 0 &&
        <EmptyState title={`Unable to load ${kind}`} description={getNetworkErrorMessage(error)}
          action={<Button onClick={() => void load(username, { page: 0 })}>Try again</Button>} />}
      {status === "loaded" && values.length === 0 && <EmptyState title={`No ${kind} yet.`} />}
      {values.map((user) => <NetworkUserCard key={user.id} user={user} />)}
    </div>
    <NetworkPagination metadata={metadata} loading={status === "loading"}
      onPage={(page) => void load(username, { page, size: metadata?.size }).catch(() => undefined)} />
  </section></AppShell>;
}
