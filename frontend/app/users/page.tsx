"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import {
  normalizeProfileUsername,
  useProfileStore,
} from "@/store/profile.store";

function PublicProfileContent() {
  const searchParams = useSearchParams();
  const username = normalizeProfileUsername(searchParams.get("username") ?? "");
  const profile = useProfileStore((state) => state.publicProfiles[username]);
  const status = useProfileStore(
    (state) => state.publicProfileStatuses[username] ?? "idle",
  );
  const error = useProfileStore(
    (state) => state.publicProfileErrors[username] ?? null,
  );
  const loadProfile = useProfileStore((state) => state.loadPublicProfile);

  useEffect(() => {
    if (username && status === "idle") {
      void loadProfile(username);
    }
  }, [loadProfile, status, username]);

  if (!username) {
    return (
      <EmptyState
        title="Profile username required"
        description="Open this page with a username query parameter."
      />
    );
  }
  if (status === "loading") {
    return <Skeleton aria-label="Loading public profile" className="h-96" />;
  }
  if (status === "error") {
    return (
      <EmptyState
        title={
          error?.code === "PROFILE_NOT_FOUND"
            ? "Profile not found"
            : "Unable to load profile"
        }
        description={
          error?.code === "PROFILE_NOT_FOUND"
            ? "No public profile exists for this username."
            : error?.message
        }
      />
    );
  }
  if (!profile) return null;

  return (
    <>
      <ProfileHeader profile={profile} isOwner={false} />
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ProfileSidebar profile={profile} />
      </div>
    </>
  );
}

export default function PublicProfilePage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-6xl px-4 py-6">
        <Suspense
          fallback={
            <Skeleton aria-label="Loading public profile" className="h-96" />
          }
        >
          <PublicProfileContent />
        </Suspense>
      </section>
    </AppShell>
  );
}
