"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormActions from "@/components/ui/FormActions";
import FormError from "@/components/ui/FormError";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import TextArea from "@/components/ui/TextArea";
import ProfileMediaEditors from "@/components/media/ProfileMediaEditors";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ApiError } from "@/services/api/apiClient";
import { useProfileStore } from "@/store/profile.store";
import type { UpdateProfileRequest } from "@/types/profile";

type Draft = {
  fullName: string;
  professionalTitle: string;
  bio: string;
  location: string;
  websiteUrl: string;
};

const emptyDraft: Draft = {
  fullName: "",
  professionalTitle: "",
  bio: "",
  location: "",
  websiteUrl: "",
};

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Unable to update your profile.";
  if (error.fieldErrors.length) {
    return error.fieldErrors.map(({ message }) => message).join(" ");
  }
  if (error.code === "INVALID_PROFILE_URL") {
    return "Website must be an absolute HTTP or HTTPS URL.";
  }
  if (error.code === "INVALID_PROFILE_UPDATE") return error.message;
  return error.message;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { isLoading: isAuthLoading, user } = useRequireAuth();
  const profile = useProfileStore((state) => state.currentProfile);
  const status = useProfileStore((state) => state.currentProfileStatus);
  const loadProfile = useProfileStore((state) => state.loadCurrentProfile);
  const updateProfile = useProfileStore((state) => state.updateCurrentProfile);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [initializedProfileId, setInitializedProfileId] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthLoading && user && status === "idle") {
      void loadProfile();
    }
  }, [isAuthLoading, loadProfile, status, user]);

  useEffect(() => {
    if (!profile || initializedProfileId === profile.id) return;
    queueMicrotask(() => {
      setDraft({
        fullName: profile.user.fullName,
        professionalTitle: profile.professionalTitle ?? "",
        bio: profile.bio ?? "",
        location: profile.location ?? "",
        websiteUrl: profile.websiteUrl ?? "",
      });
      setInitializedProfileId(profile.id);
    });
  }, [initializedProfileId, profile]);

  function setField(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || isSaving) return;
    setError("");

    const fullName = draft.fullName.trim();
    if (!fullName) {
      setError("Full name is required.");
      return;
    }
    const websiteUrl = nullable(draft.websiteUrl);
    if (websiteUrl) {
      try {
        const parsed = new URL(websiteUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error("Unsupported protocol");
        }
      } catch {
        setError("Website must be an absolute HTTP or HTTPS URL.");
        return;
      }
    }

    const request: UpdateProfileRequest = {};
    if (fullName !== profile.user.fullName) request.fullName = fullName;
    const professionalTitle = nullable(draft.professionalTitle);
    const bio = nullable(draft.bio);
    const location = nullable(draft.location);
    if (professionalTitle !== profile.professionalTitle) {
      request.professionalTitle = professionalTitle;
    }
    if (bio !== profile.bio) request.bio = bio;
    if (location !== profile.location) request.location = location;
    if (websiteUrl !== profile.websiteUrl) request.websiteUrl = websiteUrl;
    if (Object.keys(request).length === 0) {
      router.push("/profile");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(request);
      router.push("/profile");
    } catch (updateError) {
      setError(errorMessage(updateError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-8">
        {(isAuthLoading || status === "loading") && !profile && (
          <Skeleton aria-label="Loading profile editor" className="h-[36rem]" />
        )}
        {status === "error" && !profile && (
          <EmptyState
            title="Unable to load profile"
            action={<Button onClick={() => void loadProfile()}>Try again</Button>}
          />
        )}
        {profile && (
          <Card padding="lg">
            <h1 className="mb-6 text-2xl font-bold">Edit Profile</h1>
            <ProfileMediaEditors profile={profile} />
            <form onSubmit={handleSubmit} className="space-y-5">
              <FormField label="Full Name" htmlFor="profile-full-name">
                <Input
                  id="profile-full-name"
                  value={draft.fullName}
                  onChange={(event) => setField("fullName", event.target.value)}
                  maxLength={100}
                  required
                />
              </FormField>
              <FormField
                label="Professional Title"
                htmlFor="profile-professional-title"
              >
                <Input
                  id="profile-professional-title"
                  value={draft.professionalTitle}
                  onChange={(event) =>
                    setField("professionalTitle", event.target.value)
                  }
                  maxLength={120}
                />
              </FormField>
              <FormField label="About" htmlFor="profile-bio">
                <TextArea
                  id="profile-bio"
                  value={draft.bio}
                  onChange={(event) => setField("bio", event.target.value)}
                  maxLength={2000}
                />
              </FormField>
              <FormField label="Location" htmlFor="profile-location">
                <Input
                  id="profile-location"
                  value={draft.location}
                  onChange={(event) => setField("location", event.target.value)}
                  maxLength={120}
                />
              </FormField>
              <FormField label="Website" htmlFor="profile-website">
                <Input
                  id="profile-website"
                  type="url"
                  value={draft.websiteUrl}
                  onChange={(event) =>
                    setField("websiteUrl", event.target.value)
                  }
                  maxLength={500}
                  placeholder="https://example.com"
                />
              </FormField>
              <FormError message={error} />
              <FormActions>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => router.push("/profile")}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  isLoading={isSaving}
                  loadingText="Saving…"
                  disabled={isSaving}
                >
                  Save Changes
                </Button>
              </FormActions>
            </form>
          </Card>
        )}
      </section>
    </AppShell>
  );
}
