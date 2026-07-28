import { ApiError } from "@/services/api/apiClient";

const messages: Record<string, string> = {
  JOB_NOT_OPEN: "This job is not accepting applications.",
  SELF_APPLICATION_NOT_ALLOWED: "You cannot apply to your own job.",
  JOB_APPLICATION_ALREADY_EXISTS: "You have already applied to this job.",
  JOB_APPLICATION_NOT_FOUND: "This application could not be found.",
  JOB_APPLICATIONS_VIEW_FORBIDDEN: "Only the job owner can view these applications.",
  JOB_APPLICATION_VIEW_FORBIDDEN: "You do not have permission to view this application.",
  JOB_APPLICATION_WITHDRAW_FORBIDDEN: "Only the applicant can withdraw this application.",
  JOB_APPLICATION_REVIEW_FORBIDDEN: "Only the job owner can review this application.",
  INVALID_JOB_APPLICATION_TRANSITION: "This application can no longer be changed.",
  INVALID_APPLICATION_COVER_LETTER: "The cover letter must be 5,000 characters or fewer.",
  INVALID_PAGINATION: "The requested application page is invalid.",
  JOB_NOT_FOUND: "The related job could not be found.",
  UNAUTHORIZED: "Please sign in to continue.",
  NETWORK_ERROR: "The server could not be reached. Please try again.",
};

export function getJobApplicationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return messages[error.code] ?? "The application request could not be completed.";
  }
  return messages.NETWORK_ERROR;
}
