import { ApiError, apiRequest } from "./apiClient";
import type { MediaAsset, MediaListItem, MediaOrderRequest } from "@/types/media";

function encodedId(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new ApiError(400, "MEDIA_RELATION_INVALID", `${label} is required.`);
  }
  return encodeURIComponent(normalized);
}
function multipart(file: File): FormData {
  const data = new FormData();
  data.append("file", file);
  return data;
}
export const mediaService = {
  uploadProfileAvatar: (file: File) =>
    apiRequest<MediaAsset>("/media/profile/avatar", {
      method: "POST", authenticated: true, body: multipart(file),
    }),
  deleteProfileAvatar: () =>
    apiRequest<void>("/media/profile/avatar", { method: "DELETE", authenticated: true }),
  uploadProfileCover: (file: File) =>
    apiRequest<MediaAsset>("/media/profile/cover", {
      method: "POST", authenticated: true, body: multipart(file),
    }),
  deleteProfileCover: () =>
    apiRequest<void>("/media/profile/cover", { method: "DELETE", authenticated: true }),
  uploadPostImage: (postId: string, file: File) =>
    apiRequest<MediaAsset>(`/posts/${encodedId(postId, "Post ID")}/media`, {
      method: "POST", authenticated: true, body: multipart(file),
    }),
  deletePostImage: (postId: string, mediaId: string) =>
    apiRequest<void>(
      `/posts/${encodedId(postId, "Post ID")}/media/${encodedId(mediaId, "Media ID")}`,
      { method: "DELETE", authenticated: true },
    ),
  reorderPostImages: (postId: string, mediaIds: string[]) =>
    apiRequest<MediaListItem[]>(
      `/posts/${encodedId(postId, "Post ID")}/media/order`,
      { method: "PUT", authenticated: true, body: { mediaIds } satisfies MediaOrderRequest },
    ),
  uploadWorkImage: (workId: string, file: File) =>
    apiRequest<MediaAsset>(`/works/${encodedId(workId, "Work ID")}/media`, {
      method: "POST", authenticated: true, body: multipart(file),
    }),
  deleteWorkImage: (workId: string, mediaId: string) =>
    apiRequest<void>(
      `/works/${encodedId(workId, "Work ID")}/media/${encodedId(mediaId, "Media ID")}`,
      { method: "DELETE", authenticated: true },
    ),
  reorderWorkImages: (workId: string, mediaIds: string[]) =>
    apiRequest<MediaListItem[]>(
      `/works/${encodedId(workId, "Work ID")}/media/order`,
      { method: "PUT", authenticated: true, body: { mediaIds } satisfies MediaOrderRequest },
    ),
};
