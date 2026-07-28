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
import { WORK_TYPES } from "@/constants/works";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useContentStore } from "@/store/content.store";
import type { WorkType } from "@/types/works";

export default function CreateWorkPage() {
  const router = useRouter();
  const { user } = useRequireAuth();
  const createWork = useContentStore((state) => state.createWork);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<WorkType>("Video");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!user) return;

    if (!title || !description) {
      setError("Please fill in title and description.");
      return;
    }

    await createWork({
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
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-8">
        <Card padding="lg">
          <h1 className="mb-6 text-2xl font-bold">Add Work</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField label="Title" htmlFor="work-title">
              <Input
                id="work-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short Film Project"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </FormField>

            <FormField label="Type" htmlFor="work-type">
              <select
                id="work-type"
                value={type}
                onChange={(e) => setType(e.target.value as WorkType)}
              >
                {WORK_TYPES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Description" htmlFor="work-description">
              <TextArea
                id="work-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your work..."
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
                Save Work
              </Button>
            </FormActions>
          </form>
        </Card>
      </section>
    </AppShell>
  );
}
