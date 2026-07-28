import Link from "next/link";

import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { CurrentProfile, PublicProfile } from "@/types/profile";

type ProfileHeaderProps = {
  profile: CurrentProfile | PublicProfile;
  isOwner: boolean;
};

function identity(profile: CurrentProfile | PublicProfile) {
  return "user" in profile
    ? { fullName: profile.user.fullName, username: profile.user.username }
    : { fullName: profile.fullName, username: profile.username };
}

export default function ProfileHeader({
  isOwner,
  profile,
}: ProfileHeaderProps) {
  const user = identity(profile);

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="h-40 bg-black" />
      <div className="px-6 pb-6">
        <div className="-mt-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <Avatar size="xl" className="border-4 border-white" />
            <div className="pb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {user.fullName}
              </h1>
              <p className="text-sm text-gray-500">
                {profile.professionalTitle ?? "Creative community member"}
              </p>
              <p className="mt-1 text-sm text-gray-500">@{user.username}</p>
            </div>
          </div>

          <div className="flex gap-3">
            {isOwner ? (
              <Link
                href="/profile/edit"
                className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Edit Profile
              </Link>
            ) : (
              <>
                <Button
                  shape="pill"
                  size="none"
                  className="px-5 py-2 text-sm font-semibold"
                  disabled
                  title="Coming soon"
                >
                  Follow
                </Button>
                <Button
                  variant="secondary"
                  shape="pill"
                  size="none"
                  className="px-5 py-2 text-sm font-semibold"
                  disabled
                  title="Coming soon"
                >
                  Message
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Presentation fixtures until social metrics have backend support. */}
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
