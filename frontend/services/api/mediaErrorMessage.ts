import { ApiError } from "./apiClient";

const messages: Record<string, string> = {
  MEDIA_FILE_REQUIRED: "Please choose an image.",
  MEDIA_FILE_EMPTY: "The selected image is empty.",
  MEDIA_FILE_TOO_LARGE: "The selected image exceeds the allowed size.",
  MEDIA_TYPE_NOT_ALLOWED: "Only JPEG, PNG, and WebP images are supported.",
  MEDIA_CONTENT_TYPE_MISMATCH: "The file contents do not match its image type.",
  MEDIA_UPLOAD_FAILED: "The image could not be uploaded. Please try again.",
  MEDIA_NOT_FOUND: "This image is no longer available.",
  MEDIA_ACCESS_FORBIDDEN: "You do not have permission to change this media.",
  MEDIA_LIMIT_EXCEEDED: "The image limit has been reached.",
  MEDIA_RELATION_INVALID: "The image does not belong to this item.",
  MEDIA_ORDER_INVALID: "The image order changed. Refresh and retry.",
  MEDIA_STORAGE_UNAVAILABLE: "Media storage is temporarily unavailable. Please try later.",
};
export function getMediaErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "The media operation could not be completed.";
  return messages[error.code] ?? error.message;
}
