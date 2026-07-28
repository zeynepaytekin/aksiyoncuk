"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { CurrentProfile, PublicProfile } from "@/types/profile";

type ProfileSidebarProps = {
  profile: CurrentProfile | PublicProfile;
};

export default function ProfileSidebar({ profile }: ProfileSidebarProps) {
  return (
    <aside className="space-y-6 lg:col-span-4">
      <Card as="section">
        <h2 className="mb-3 text-lg font-bold">About</h2>
        <p className="text-sm leading-6 text-gray-600">
          {profile.bio ?? "No biography has been added yet."}
        </p>
        {profile.location && (
          <p className="mt-3 text-sm text-gray-500">{profile.location}</p>
        )}
        {profile.websiteUrl && (
          <a
            href={profile.websiteUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 block break-all text-sm font-medium text-blue-600 hover:underline"
          >
            {profile.websiteUrl}
          </a>
        )}
      </Card>

      {/* Presentation fixtures until badges have backend support. */}
      <Card as="section">
        <h2 className="mb-3 text-lg font-bold">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Verified Pro</Badge>
          <Badge>Course Certified</Badge>
          <Badge>Active Project</Badge>
        </div>
      </Card>

      {/* Presentation fixtures until profile switching has backend support. */}
      <Card as="section">
        <h2 className="mb-3 text-lg font-bold">Switch Profiles</h2>
        <div className="space-y-2">
          {["Networking", "Freelancer", "Teaching", "Film Distribution"].map(
            (item) => (
              <Button
                key={item}
                variant="unstyled"
                size="none"
                className="w-full rounded-xl border border-gray-200 px-4 py-2 text-left text-sm hover:bg-gray-50"
                disabled
              >
                {item}
              </Button>
            ),
          )}
        </div>
      </Card>
    </aside>
  );
}
