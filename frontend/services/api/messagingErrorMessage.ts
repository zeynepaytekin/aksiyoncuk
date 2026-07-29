import type { ApiError } from "@/services/api/apiClient";

const messages: Record<string, string> = {
  SELF_CONVERSATION_NOT_ALLOWED: "You cannot start a conversation with yourself.",
  PROFILE_NOT_FOUND: "No profile was found for that username.",
  CONVERSATION_NOT_FOUND: "This conversation could not be found.",
  CONVERSATION_ACCESS_FORBIDDEN: "You do not have access to this conversation.",
  INVALID_MESSAGE_CONTENT: "Enter a message between 1 and 5000 characters.",
  INVALID_MESSAGING_PAGINATION: "That page of messages is not available.",
};

export function getMessagingErrorMessage(error: ApiError): string {
  return messages[error.code] ?? (error.status === 0
    ? "Messaging is temporarily unavailable. Check your connection and try again."
    : "The messaging request could not be completed.");
}
