"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormActions from "@/components/ui/FormActions";
import FormError from "@/components/ui/FormError";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import TextArea from "@/components/ui/TextArea";
import { JOB_CATEGORIES } from "@/constants/jobs";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useContentStore } from "@/store/content.store";
import type { JobCategory } from "@/types/jobs";

export default function CreateJobPage() {
  const router = useRouter();
  const { user } = useRequireAuth();
  const createJob = useContentStore((state) => state.createJob);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<JobCategory>("Volunteer");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!user) return;

    if (!title || !description || !location) {
      setError("Please fill in all fields.");
      return;
    }

    await createJob({
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
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-8">
        <Card padding="lg">
          <h1 className="mb-6 text-2xl font-bold">Create Job / Project</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField label="Title" htmlFor="job-title">
              <Input
                id="job-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Looking for editor for short film"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </FormField>

            <FormField label="Category" htmlFor="job-category">
              <select
                id="job-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as JobCategory)}
              >
                {JOB_CATEGORIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Location" htmlFor="job-location">
              <Input
                id="job-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Istanbul / Remote"
              />
            </FormField>

            <FormField label="Description" htmlFor="job-description">
              <TextArea
                id="job-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the project or job..."
              />
            </FormField>

            <FormError message={error} />

            <FormActions>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push("/profile")}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                size="lg"
              >
                Publish Job
              </Button>
            </FormActions>
          </form>
        </Card>
      </section>
    </AppShell>
  );
}
