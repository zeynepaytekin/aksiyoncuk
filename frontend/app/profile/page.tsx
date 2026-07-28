"use client";

import { useEffect } from "react";

import AppShell from "@/components/layout/AppShell";
import ProfileContent from "@/components/profile/ProfileContent";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useProfileStore } from "@/store/profile.store";
import { useNetworkStore } from "@/store/network.store";

export default function ProfilePage() {
  const { isLoading: isAuthLoading, user } = useRequireAuth();
  const profile = useProfileStore((state) => state.currentProfile);
  const status = useProfileStore((state) => state.currentProfileStatus);
  const error = useProfileStore((state) => state.currentProfileError);
  const loadProfile = useProfileStore((state) => state.loadCurrentProfile);
  const summary = useNetworkStore((state) => state.summary);
  const summaryStatus = useNetworkStore((state) => state.summaryStatus);
  const loadSummary = useNetworkStore((state) => state.loadMySummary);

  useEffect(() => {
    if (!isAuthLoading && user && status === "idle") {
      void loadProfile();
    }
    if (!isAuthLoading && user && summaryStatus === "idle") {
      void loadSummary().catch(() => undefined);
    }
  }, [isAuthLoading, loadProfile, loadSummary, status, summaryStatus, user]);

  return (
    <AppShell>
      <section className="mx-auto max-w-6xl px-4 py-6">
        {(isAuthLoading || status === "loading") && !profile && (
          <div aria-label="Loading profile" className="space-y-6">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}
        {status === "error" && !profile && (
          <EmptyState
            title="Unable to load profile"
            description={error?.message}
            action={<Button onClick={() => void loadProfile()}>Try again</Button>}
          />
        )}
        {profile && (
          <>
            <ProfileHeader profile={profile} isOwner mutualCount={summary?.mutualCount} />
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
              <ProfileSidebar profile={profile} />
              <ProfileContent />
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
