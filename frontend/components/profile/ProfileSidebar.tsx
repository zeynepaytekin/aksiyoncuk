"use client";

import { useAuth } from "../../context/AuthContext";

export default function ProfileSidebar() {
  const { user } = useAuth();

  return (
    <aside className="space-y-6 lg:col-span-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold">About</h2>
        <p className="text-sm leading-6 text-gray-600">
          {user?.bio ||
            "Film ve yaratıcı sektör profesyonelleriyle bağlantı kuran, projeler geliştiren ve portfolyosunu sergileyen bir kullanıcı profili."}
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            Verified Pro
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            Course Certified
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            Active Project
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold">Switch Profiles</h2>
        <div className="space-y-2">
          {["Networking", "Freelancer", "Teaching", "Film Distribution"].map(
            (item) => (
              <button
                key={item}
                className="w-full rounded-xl border border-gray-200 px-4 py-2 text-left text-sm hover:bg-gray-50"
              >
                {item}
              </button>
            )
          )}
        </div>
      </section>
    </aside>
  );
}