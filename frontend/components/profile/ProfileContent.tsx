"use client";

import CrowdfundingSection from "@/components/crowdfunding/CrowdfundingSection";
import ProfilePostsSection from "@/components/feed/ProfilePostsSection";
import ProfileJobsSection from "@/components/jobs/ProfileJobsSection";
import ProfileNavigation from "@/components/profile/ProfileNavigation";
import ProfileWorksSection from "@/components/works/ProfileWorksSection";

export default function ProfileContent() {
  return (
    <section className="space-y-6 lg:col-span-8">
      <ProfileNavigation />
      <ProfileWorksSection />
      <ProfileJobsSection />
      <ProfilePostsSection />
      <CrowdfundingSection />
    </section>
  );
}
