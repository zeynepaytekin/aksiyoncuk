"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import { getNetworkErrorMessage } from "@/services/api/networkErrorMessage";
import { useAuthStore } from "@/store/auth.store";
import { useNetworkStore } from "@/store/network.store";
import type { NetworkUser } from "@/types/network";

export default function NetworkUserCard({ user }: { user: NetworkUser }) {
  const current = useAuthStore((state) => state.user);
  const toggle = useNetworkStore((state) => state.toggleFollow);
  const status = useNetworkStore(
    (state) => state.followStatusByUsername[user.username.toLowerCase()] ?? "idle",
  );
  const error = useNetworkStore(
    (state) => state.followErrorByUsername[user.username.toLowerCase()],
  );
  const self = current?.id === user.id;
  return <article className="rounded-xl border border-gray-200 bg-white p-4">
    <div className="flex items-center justify-between gap-4">
      <Link href={`/users?username=${encodeURIComponent(user.username)}`}
        aria-label={`View ${user.fullName}'s profile`}>
        <h2 className="font-semibold">{user.fullName}</h2>
        <p className="text-sm text-gray-500">@{user.username}</p>
        {user.professionalTitle && <p className="text-xs text-gray-500">{user.professionalTitle}</p>}
      </Link>
      {!self && (current ? <Button size="sm" variant={user.followedByCurrentUser ? "secondary" : "primary"}
        aria-pressed={user.followedByCurrentUser} disabled={status === "loading"}
        isLoading={status === "loading"} loadingText="Saving..."
        onClick={() => void toggle(user.username).catch(() => undefined)}>
        {user.followedByCurrentUser ? "Following" : "Follow"}
      </Button> : <Link className="text-sm font-medium underline" href="/login">Sign in to follow</Link>)}
    </div>
    {error && <div role="alert" aria-live="polite" className="mt-2">
      <FormError message={getNetworkErrorMessage(error)} />
    </div>}
  </article>;
}
