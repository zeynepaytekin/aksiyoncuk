"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormActions from "@/components/ui/FormActions";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import TextArea from "@/components/ui/TextArea";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function EditProfilePage() {
  const router = useRouter();
  const { isLoading, user, updateUser } = useRequireAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (isLoading || !user) return;

    queueMicrotask(() => {
      setFullName(user.fullName || "");
      setUsername(user.username || "");
      setRole(user.role || "");
      setBio(user.bio || "");
    });
  }, [isLoading, user]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!user) return;

    await updateUser({
      ...user,
      fullName,
      username,
      role,
      bio,
    });

    router.push("/profile");
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-8">
        <Card padding="lg">
          <h1 className="mb-6 text-2xl font-bold">Edit Profile</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField label="Full Name" htmlFor="profile-full-name">
              <Input
                id="profile-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </FormField>

            <FormField label="Username" htmlFor="profile-username">
              <Input
                id="profile-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
              />
            </FormField>

            <FormField label="Role / Title" htmlFor="profile-role">
              <Input
                id="profile-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Director / Actor / Creator"
              />
            </FormField>

            <FormField label="About" htmlFor="profile-bio">
              <TextArea
                id="profile-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people about yourself..."
              />
            </FormField>

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
                Save Changes
              </Button>
            </FormActions>
          </form>
        </Card>
      </section>
    </AppShell>
  );
}
