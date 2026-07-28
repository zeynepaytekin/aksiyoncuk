"use client";

import AppShell from "@/components/layout/AppShell";
import ProfileContent from "@/components/profile/ProfileContent";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import { useAuthStore } from "@/store/auth.store";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <AppShell>
      <section className="mx-auto max-w-6xl px-4 py-6">
        <ProfileHeader user={user} />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <ProfileSidebar />
          <ProfileContent />
        </div>
      </section>
    </AppShell>
  );
}
