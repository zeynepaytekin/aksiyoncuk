"use client";

import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import ImageFilePicker from "./ImageFilePicker";
import { mediaService } from "@/services/api/media.service";
import { getMediaErrorMessage } from "@/services/api/mediaErrorMessage";
import { useProfileStore } from "@/store/profile.store";
import type { CurrentProfile } from "@/types/profile";

export default function ProfileMediaEditors({ profile }: { profile: CurrentProfile }) {
  const reload = useProfileStore((state) => state.loadCurrentProfile);
  const [avatar, setAvatar] = useState<File[]>([]);
  const [cover, setCover] = useState<File[]>([]);
  const [busy, setBusy] = useState<"avatar" | "cover" | "">("");
  const [message, setMessage] = useState("");
  async function mutate(kind: "avatar" | "cover", operation: () => Promise<unknown>) {
    if (busy) return;
    setBusy(kind); setMessage("");
    try { await operation(); await reload({ force: true }); if (kind === "avatar") setAvatar([]); else setCover([]); }
    catch (error) { setMessage(getMediaErrorMessage(error)); }
    finally { setBusy(""); }
  }
  return (
    <section className="space-y-6 border-b border-gray-100 pb-6" aria-label="Profile images">
      <div className="space-y-3">
        <h2 className="font-semibold">Profile photo</h2>
        <Avatar src={profile.avatarUrl ?? undefined} alt={`${profile.user.fullName}'s profile photo`}
          fallback={profile.user.fullName.slice(0, 1)} size="xl" />
        <ImageFilePicker purpose="avatar" files={avatar} onChange={setAvatar} disabled={busy !== ""} />
        <div className="flex gap-2">
          <Button type="button" disabled={!avatar[0] || Boolean(busy)} isLoading={busy === "avatar"}
            onClick={() => void mutate("avatar", () => mediaService.uploadProfileAvatar(avatar[0]))}>Upload photo</Button>
          {profile.avatarUrl && <Button type="button" variant="secondary" disabled={Boolean(busy)}
            onClick={() => { if (window.confirm("Delete your profile photo?")) void mutate("avatar", mediaService.deleteProfileAvatar); }}>Delete</Button>}
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="font-semibold">Cover image</h2>
        <div className="h-36 overflow-hidden rounded-xl bg-gray-200">
          {profile.coverUrl && /* eslint-disable-next-line @next/next/no-img-element */
            <img src={profile.coverUrl} alt="Current profile cover" className="h-full w-full object-cover" />}
        </div>
        <ImageFilePicker purpose="cover" files={cover} onChange={setCover} disabled={busy !== ""} />
        <div className="flex gap-2">
          <Button type="button" disabled={!cover[0] || Boolean(busy)} isLoading={busy === "cover"}
            onClick={() => void mutate("cover", () => mediaService.uploadProfileCover(cover[0]))}>Upload cover</Button>
          {profile.coverUrl && <Button type="button" variant="secondary" disabled={Boolean(busy)}
            onClick={() => { if (window.confirm("Delete your cover image?")) void mutate("cover", mediaService.deleteProfileCover); }}>Delete</Button>}
        </div>
      </div>
      <p className="text-xs text-gray-500">Images are public and may retain EXIF/GPS metadata.</p>
      {message && <div role="alert" aria-live="polite"><FormError message={message} /></div>}
    </section>
  );
}
