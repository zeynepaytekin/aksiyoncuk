"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/layout/Navbar";
import { useAuth } from "../../../context/AuthContext";
import { addWork } from "../../../lib/works";

export default function CreateWorkPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"Video" | "Photo" | "Other">("Video");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!user) return;

    if (!title || !description) {
      setError("Please fill in title and description.");
      return;
    }

    addWork({
      id: Date.now(),
      userEmail: user.email,
      title,
      description,
      type,
      createdAt: new Date().toLocaleString(),
    });

    router.push("/profile");
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="mb-6 text-2xl font-bold">Add Work</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short Film Project"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "Video" | "Photo" | "Other")
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option>Video</option>
                <option>Photo</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your work..."
                className="min-h-32 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            {error && <p className="text-sm font-medium text-red-500">{error}</p>}

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
                Save Work
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}