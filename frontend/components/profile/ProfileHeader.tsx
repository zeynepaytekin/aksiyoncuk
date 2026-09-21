"use client";

import Link from "next/link";

import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { CurrentProfile, PublicProfile } from "@/types/profile";
import FormError from "@/components/ui/FormError";
import { getNetworkErrorMessage } from "@/services/api/networkErrorMessage";
import { useAuthStore } from "@/store/auth.store";
import { useNetworkStore } from "@/store/network.store";

type ProfileHeaderProps = {
  profile: CurrentProfile | PublicProfile;
  isOwner: boolean;
  mutualCount?: number | null;
};

function identity(profile: CurrentProfile | PublicProfile) {
  return "user" in profile
    ? { fullName: profile.user.fullName, username: profile.user.username }
    : { fullName: profile.fullName, username: profile.username };
}

export default function ProfileHeader({
  isOwner,
  profile,
  mutualCount = null,
}: ProfileHeaderProps) {
  const user = identity(profile);
  const authenticatedUser = useAuthStore((state) => state.user);
  const toggle = useNetworkStore((state) => state.toggleFollow);
  const followStatus = useNetworkStore(
    (state) => state.followStatusByUsername[user.username.toLowerCase()] ?? "idle",
  );
  const followError = useNetworkStore(
    (state) => state.followErrorByUsername[user.username.toLowerCase()],
  );
  const self = isOwner || authenticatedUser?.id === ("userId" in profile
    ? profile.userId : profile.user.id);
  const pending = followStatus === "loading";

  return (
    <Card padding="none" className="overflow-hidden border-[#191815] shadow-[5px_5px_0_#f5a56f]">
      <div className="relative h-44 overflow-hidden bg-[#fbd8bf]">
        <div className="absolute -left-10 -top-24 h-60 w-60 rounded-full border border-[#191815] bg-[#f7e98b]" />
        <div className="absolute right-12 top-8 rotate-[-8deg] text-7xl font-black text-[#191815]/10">CREATE</div>
        <div className="absolute bottom-4 right-6 rounded-full border border-[#191815] bg-[#fffdf8] px-4 py-2 text-xs font-bold">open to collaboration ✦</div>
        {profile.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.coverUrl} alt={`${user.fullName}'s cover`} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="px-6 pb-6">
        <div className="-mt-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <Avatar src={profile.avatarUrl ?? undefined} alt={`${user.fullName}'s profile photo`}
              fallback={user.fullName.slice(0, 1).toUpperCase()} size="xl" className="border-4 border-white" />
            <div className="pb-2">
              <h1 className="display-type text-4xl text-[#191815]">
                {user.fullName}
              </h1>
              <p className="text-sm text-gray-500">
                {profile.professionalTitle ?? "Creative community member"}
              </p>
              <p className="mt-1 text-sm text-gray-500">@{user.username}</p>
            </div>
          </div>

          <div className="flex gap-3">
            {self ? (
              <Link
                href="/profile/edit"
                className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Edit Profile
              </Link>
            ) : authenticatedUser ? (
              <>
                <Button
                  shape="pill"
                  size="none"
                  className="px-5 py-2 text-sm font-semibold"
                  disabled={pending}
                  isLoading={pending}
                  loadingText="Saving..."
                  aria-pressed={profile.followedByCurrentUser}
                  variant={profile.followedByCurrentUser ? "secondary" : "primary"}
                  onClick={() => void toggle(user.username).catch(() => undefined)}
                >
                  {profile.followedByCurrentUser ? "Following" : "Follow"}
                </Button>
              </>
            ) : (
              <Link href="/login" className="rounded-full border px-5 py-2 text-sm font-semibold">
                Sign in to follow
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-gray-100 pt-5 text-center">
          <Link href={`/network/followers?username=${encodeURIComponent(user.username)}`}
            aria-label={`${profile.followerCount} followers`}>
            <p className="text-xl font-bold">{profile.followerCount}</p>
            <p className="text-sm text-gray-500">Followers</p>
          </Link>
          <Link href={`/network/following?username=${encodeURIComponent(user.username)}`}
            aria-label={`${profile.followingCount} following`}>
            <p className="text-xl font-bold">{profile.followingCount}</p>
            <p className="text-sm text-gray-500">Following</p>
          </Link>
          {self ? <Link href="/network" aria-label={`${mutualCount ?? 0} mutual connections`}>
            <p className="text-xl font-bold">{mutualCount ?? "—"}</p>
            <p className="text-sm text-gray-500">Mutuals</p>
          </Link> : <div>
            <p className="text-xl font-bold">—</p>
            <p className="text-sm text-gray-500">Mutuals</p>
          </div>}
        </div>
        {followError && <div role="alert" aria-live="polite" className="mt-3">
          <FormError message={getNetworkErrorMessage(followError)} />
        </div>}
      </div>
    </Card>
  );
}
