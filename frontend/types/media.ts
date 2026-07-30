export const MEDIA_USAGE_TYPES = [
  "PROFILE_AVATAR",
  "PROFILE_COVER",
  "POST_IMAGE",
  "WORK_IMAGE",
  "FREELANCE_SERVICE_IMAGE",
] as const;
export type MediaUsageType = (typeof MEDIA_USAGE_TYPES)[number];
export type MediaUploadPurpose = "avatar" | "cover" | "post" | "work" | "freelance";
export type MediaAsset = {
  id: string; url: string; contentType: string; sizeBytes: number;
  usageType: MediaUsageType; displayOrder: number | null; createdAt: string;
};
export type MediaListItem = {
  id: string; url: string; contentType: string; width: number | null;
  height: number | null; displayOrder: number;
};
export type MediaOrderRequest = { mediaIds: string[] };
export type SelectedImageFile = {
  id: string; file: File; previewUrl: string;
  status: "pending" | "uploading" | "succeeded" | "failed"; error?: string;
};
export type UploadValidationResult =
  | { valid: true }
  | { valid: false; message: string };
