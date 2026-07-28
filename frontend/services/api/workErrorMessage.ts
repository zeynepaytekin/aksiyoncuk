import { ApiError } from "@/services/api/apiClient";

const MESSAGES: Record<string, string> = {
  WORK_NOT_FOUND: "This work could not be found.",
  WORK_UPDATE_FORBIDDEN: "Only the owner can edit this work.",
  WORK_DELETE_FORBIDDEN: "Only the owner can delete this work.",
  INVALID_WORK_TITLE: "Enter a title of no more than 200 characters.",
  INVALID_WORK_URL: "Enter an absolute HTTP or HTTPS project URL.",
  INVALID_WORK_YEAR: "Enter a valid release year.",
  INVALID_WORK_TYPE: "Select a supported work type.",
  INVALID_PAGINATION: "That portfolio page could not be loaded.",
  UNAUTHORIZED: "Please sign in to continue.",
  NETWORK_ERROR: "The server could not be reached. Please try again.",
};

export function getWorkErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return MESSAGES[error.code] ?? "The request could not be completed.";
  }
  return "Something went wrong. Please try again.";
}
