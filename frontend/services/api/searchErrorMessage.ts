import { ApiError } from "./apiClient";

const messages: Record<string, string> = {
  INVALID_SEARCH_QUERY: "Enter a search term between 2 and 100 characters.",
  INVALID_SEARCH_PAGINATION: "The requested search page is invalid.",
  INVALID_SEARCH_FILTER: "One or more search filters are invalid.",
  UNAUTHORIZED: "Sign in to perform this action.",
  NETWORK_ERROR: "Search is temporarily unavailable. Please try again.",
};

export function getSearchErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? (messages[error.code] ?? "Search could not be completed.")
    : "Search could not be completed.";
}
