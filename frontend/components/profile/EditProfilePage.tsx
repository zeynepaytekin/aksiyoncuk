"use client";

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
  const { user } = useRequireAuth();

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-8">
        <Card padding="lg">
          <h1 className="mb-6 text-2xl font-bold">Edit Profile</h1>
          <p className="mb-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Profile editing will be enabled when a backend profile update
            endpoint is available. Authenticated identity is read-only for now.
          </p>

          <form className="space-y-5">
            <FormField label="Full Name" htmlFor="profile-full-name">
              <Input
                id="profile-full-name"
                value={user?.fullName ?? ""}
                disabled
              />
            </FormField>
            <FormField label="Username" htmlFor="profile-username">
              <Input
                id="profile-username"
                value={user?.username ?? ""}
                disabled
              />
            </FormField>
            <FormField label="Role / Title" htmlFor="profile-role">
              <Input id="profile-role" value="" disabled />
            </FormField>
            <FormField label="About" htmlFor="profile-bio">
              <TextArea id="profile-bio" value="" disabled />
            </FormField>
            <FormActions>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => router.push("/profile")}
              >
                Cancel
              </Button>
              <Button type="button" size="lg" disabled>
                Save Changes
              </Button>
            </FormActions>
          </form>
        </Card>
      </section>
    </AppShell>
  );
}
