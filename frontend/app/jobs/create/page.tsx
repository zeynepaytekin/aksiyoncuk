"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/layout/Navbar";
import { useAuth } from "../../../context/AuthContext";
import { addJob } from "../../../lib/jobs";

export default function CreateJobPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<
    "Volunteer" | "Student" | "Amateur" | "Professional"
  >("Volunteer");
  const [location, setLocation] = useState("");
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

    if (!title || !description || !location) {
      setError("Please fill in all fields.");
      return;
    }

    addJob({
      id: Date.now(),
      userEmail: user.email,
      title,
      description,
      category,
      location,
      createdAt: new Date().toLocaleString(),
    });

    router.push("/profile");
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="mb-6 text-2xl font-bold">Create Job / Project</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Looking for editor for short film"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value as
                      | "Volunteer"
                      | "Student"
                      | "Amateur"
                      | "Professional"
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option>Volunteer</option>
                <option>Student</option>
                <option>Amateur</option>
                <option>Professional</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Istanbul / Remote"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the project or job..."
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
                Publish Job
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}