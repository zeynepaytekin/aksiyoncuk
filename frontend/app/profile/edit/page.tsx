"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/layout/Navbar";
import { useAuth } from "../../../context/AuthContext";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    setFullName(user.fullName || "");
    setUsername(user.username || "");
    setRole(user.role || "");
    setBio(user.bio || "");
  }, [user, router]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!user) return;

    updateUser({
      ...user,
      fullName,
      username,
      role,
      bio,
    });

    router.push("/profile");
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="mb-6 text-2xl font-bold">Edit Profile</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="username"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Role / Title
              </label>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Director / Actor / Creator"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                About
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="min-h-32 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Tell people about yourself..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}