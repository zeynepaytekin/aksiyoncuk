import Link from "next/link";
import { User } from "../../lib/auth";

type ProfileHeaderProps = {
  user: User | null;
};

export default function ProfileHeader({ user }: ProfileHeaderProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="h-40 bg-black" />

      <div className="px-6 pb-6">
        <div className="-mt-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <div className="h-28 w-28 rounded-full border-4 border-white bg-gray-200" />

            <div className="pb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {user?.fullName || "Aksiyoncuk User"}
              </h1>
              <p className="text-sm text-gray-500">
                {user?.role || "Director / Actor / Creator"}
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
            <button className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white hover:opacity-90">
              Follow
            </button>
            <button className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Message
            </button>
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
    </div>
  );
}