import Link from "next/link";

import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { User } from "@/types/auth";

type ProfileHeaderProps = {
  user: User | null;
};

export default function ProfileHeader({ user }: ProfileHeaderProps) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="h-40 bg-black" />

      <div className="px-6 pb-6">
        <div className="-mt-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <Avatar size="xl" className="border-4 border-white" />

            <div className="pb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {user?.fullName || "Aksiyoncuk User"}
              </h1>
              <p className="text-sm text-gray-500">
                Profile details not yet connected
              </p>
              <p className="mt-1 text-sm text-gray-500">
                @{user?.username || "username"}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/profile/edit"
              className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Edit Profile
            </Link>
            <Button shape="pill" size="none" className="px-5 py-2 text-sm font-semibold">
              Follow
            </Button>
            <Button variant="secondary" shape="pill" size="none" className="px-5 py-2 text-sm font-semibold">
              Message
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-gray-100 pt-5 text-center">
          <div>
            <p className="text-xl font-bold">1,284</p>
            <p className="text-sm text-gray-500">Followers</p>
          </div>
          <div>
            <p className="text-xl font-bold">342</p>
            <p className="text-sm text-gray-500">Mutuals</p>
          </div>
          <div>
            <p className="text-xl font-bold">8,920</p>
            <p className="text-sm text-gray-500">Profile Views</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
