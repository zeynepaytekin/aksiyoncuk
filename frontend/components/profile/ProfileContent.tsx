"use client";

import { useEffect } from "react";

import CrowdfundingSection from "@/components/crowdfunding/CrowdfundingSection";
import ProfilePostsSection from "@/components/feed/ProfilePostsSection";
import ProfileJobsSection from "@/components/jobs/ProfileJobsSection";
import ProfileNavigation from "@/components/profile/ProfileNavigation";
import ProfileWorksSection from "@/components/works/ProfileWorksSection";
import { useAuthStore } from "@/store/auth.store";
import { useContentStore } from "@/store/content.store";

export default function ProfileContent() {
  const user = useAuthStore((state) => state.user);
  const works = useContentStore((state) => state.works);
  const jobs = useContentStore((state) => state.jobs);
  const loadProfile = useContentStore((state) => state.loadProfile);

  useEffect(() => {
    if (!user?.email) return;
    void loadProfile(user.email);
  }, [loadProfile, user]);

  return (
    <section className="space-y-6 lg:col-span-8">
      <ProfileNavigation />
      <ProfileWorksSection works={works} />
      <ProfileJobsSection jobs={jobs} />
      <ProfilePostsSection />
      <CrowdfundingSection />
    </section>
  );
}
