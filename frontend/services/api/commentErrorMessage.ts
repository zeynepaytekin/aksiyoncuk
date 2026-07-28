import { ApiError } from "@/services/api/apiClient";

const COMMENT_ERROR_MESSAGES: Record<string, string> = {
  INVALID_COMMENT_CONTENT:
    "Comment content must be between 1 and 2000 characters.",
  INVALID_PAGINATION: "That comment page could not be loaded.",
  POST_NOT_FOUND: "This post no longer exists.",
  COMMENT_NOT_FOUND: "This comment no longer exists.",
  COMMENT_DELETE_FORBIDDEN: "You can only delete your own comments.",
  UNAUTHORIZED: "Please sign in to continue.",
};

export function getCommentErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return COMMENT_ERROR_MESSAGES[error.code] ?? error.message;
  }
  if (error instanceof TypeError) {
    return "The server could not be reached. Please check your connection.";
  }
  return "Something went wrong. Please try again.";
}
