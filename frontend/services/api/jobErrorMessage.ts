import { ApiError } from "@/services/api/apiClient";

const messages: Record<string, string> = {
  JOB_NOT_FOUND: "This job listing could not be found.",
  JOB_UPDATE_FORBIDDEN: "Only the owner can update this listing.",
  JOB_DELETE_FORBIDDEN: "Only the owner can delete this listing.",
  INVALID_JOB_TITLE: "Enter a title of no more than 200 characters.",
  INVALID_JOB_DESCRIPTION: "Enter a description of no more than 5000 characters.",
  INVALID_JOB_COMPENSATION: "Check the compensation amount and currency.",
  INVALID_JOB_CURRENCY: "Currency must be a three-letter code.",
  INVALID_JOB_DEADLINE: "The application deadline must be in the future.",
  INVALID_JOB_TYPE: "Select a supported job option.",
  INVALID_PAGINATION: "That jobs page could not be loaded.",
  UNAUTHORIZED: "Please sign in to continue.",
  NETWORK_ERROR: "The server could not be reached. Please try again.",
};

export function getJobErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? (messages[error.code] ?? "The request could not be completed.")
    : "Something went wrong. Please try again.";
}
