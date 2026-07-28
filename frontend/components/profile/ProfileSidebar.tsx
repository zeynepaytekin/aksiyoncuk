"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function ProfileSidebar() {
  return (
    <aside className="space-y-6 lg:col-span-4">
      <Card as="section">
        <h2 className="mb-3 text-lg font-bold">About</h2>
        <p className="text-sm leading-6 text-gray-600">
          Profile biography is not yet available from the authentication API.
        </p>
      </Card>

      <Card as="section">
        <h2 className="mb-3 text-lg font-bold">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>
            Verified Pro
          </Badge>
          <Badge>
            Course Certified
          </Badge>
          <Badge>
            Active Project
          </Badge>
        </div>
      </Card>

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
              >
                {item}
              </Button>
            )
          )}
        </div>
      </Card>
    </aside>
  );
}
