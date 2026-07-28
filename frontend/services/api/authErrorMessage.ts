import { ApiError } from "@/services/api/apiClient";

const messages: Record<string, string> = {
  INVALID_CREDENTIALS: "The email, username, or password is incorrect.",
  EMAIL_ALREADY_EXISTS: "An account with this email already exists.",
  USERNAME_ALREADY_EXISTS: "This username is already taken.",
  NETWORK_ERROR: "Unable to connect. Check that the API is running and try again.",
};

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Something went wrong. Please try again.";
  }
  if (messages[error.code]) return messages[error.code];
  if (error.fieldErrors.length) {
    return error.fieldErrors.map(({ message }) => message).join(" ");
  }
  return error.message;
}
