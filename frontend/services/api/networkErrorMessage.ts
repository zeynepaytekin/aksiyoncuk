import { ApiError } from "@/services/api/apiClient";

const messages: Record<string, string> = {
  SELF_FOLLOW_NOT_ALLOWED: "You cannot follow yourself.",
  INVALID_NETWORK_PAGINATION: "The requested network page is invalid.",
  PROFILE_NOT_FOUND: "This profile could not be found.",
  UNAUTHORIZED: "Please sign in to continue.",
  INVALID_ACCESS_TOKEN: "Your session is no longer valid. Please sign in again.",
  EXPIRED_ACCESS_TOKEN: "Your session expired. Please sign in again.",
  NETWORK_ERROR: "The server could not be reached. Please try again.",
};

export function getNetworkErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return messages[error.code] ?? "The network request could not be completed.";
  }
  return messages.NETWORK_ERROR;
}
