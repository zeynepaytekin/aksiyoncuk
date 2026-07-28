import { ApiError } from "@/services/api/apiClient";

const messages: Record<string, string> = {
  NOTIFICATION_NOT_FOUND: "This notification is no longer available.",
  NOTIFICATION_ACCESS_FORBIDDEN: "You cannot change this notification.",
  INVALID_NOTIFICATION_PAGINATION: "The requested notification page is invalid.",
  INVALID_NOTIFICATION_TYPE: "The selected notification type is invalid.",
  UNAUTHORIZED: "Sign in to view your notifications.",
  INVALID_ACCESS_TOKEN: "Your session is no longer valid. Please sign in again.",
  EXPIRED_ACCESS_TOKEN: "Your session expired. Please sign in again.",
  NETWORK_ERROR: "Notifications could not be reached. Check your connection.",
};

export function getNotificationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return messages[error.code] ?? "The notification request could not be completed.";
  }
  return "The notification request could not be completed.";
}
