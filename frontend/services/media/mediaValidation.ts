import type { MediaUploadPurpose, UploadValidationResult } from "@/types/media";

export const MEDIA_LIMITS: Record<MediaUploadPurpose, number> = {
  avatar: 5 * 1024 * 1024,
  cover: 10 * 1024 * 1024,
  post: 10 * 1024 * 1024,
  work: 15 * 1024 * 1024,
  freelance: 15 * 1024 * 1024,
};
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export function validateImageFile(
  file: File,
  purpose: MediaUploadPurpose,
): UploadValidationResult {
  if (file.size === 0) return { valid: false, message: "The selected image is empty." };
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return { valid: false, message: "Choose a JPEG, PNG, or WebP image." };
  }
  const limit = MEDIA_LIMITS[purpose];
  if (file.size > limit) {
    return { valid: false, message: `The image must be ${limit / 1024 / 1024} MB or smaller.` };
  }
  return { valid: true };
}
