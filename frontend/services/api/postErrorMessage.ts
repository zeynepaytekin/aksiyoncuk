import { ApiError } from "@/services/api/apiClient";

const POST_ERROR_MESSAGES: Record<string, string> = {
  INVALID_POST_CONTENT: "Post content must be between 1 and 3000 characters.",
  INVALID_PAGINATION: "That feed page could not be loaded.",
  POST_NOT_FOUND: "This post no longer exists.",
  POST_DELETE_FORBIDDEN: "You can only delete your own posts.",
  UNAUTHORIZED: "Please sign in to continue.",
};

export function getPostErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return POST_ERROR_MESSAGES[error.code] ?? error.message;
  }
  if (error instanceof TypeError) {
    return "The server could not be reached. Please check your connection.";
  }
  return "Something went wrong. Please try again.";
}
