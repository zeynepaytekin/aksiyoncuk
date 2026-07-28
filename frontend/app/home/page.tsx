"use client";

import Feed from "@/components/feed/Feed";
import AppShell from "@/components/layout/AppShell";
import LeftSidebar from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";

export default function HomePage() {
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
