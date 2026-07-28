import type { JobOwner, JobStatus } from "@/types/jobs";

export const JOB_APPLICATION_STATUS_VALUES = [
  "SUBMITTED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
] as const;

export type JobApplicationStatus =
  (typeof JOB_APPLICATION_STATUS_VALUES)[number];

export type JobApplicationApplicant = {
  id: string;
  username: string;
  fullName: string;
  professionalTitle: string | null;
};

export type JobApplicationOwner = JobOwner;

export type JobApplicationJob = {
  id: string;
  title: string;
  status: JobStatus;
  owner: JobApplicationOwner;
};

export type JobApplication = {
  id: string;
  status: JobApplicationStatus;
  coverLetter: string | null;
  appliedAt: string;
  updatedAt: string;
  withdrawnAt: string | null;
  reviewedAt: string | null;
  job: JobApplicationJob;
  applicant: JobApplicationApplicant;
  ownedByCurrentApplicant: boolean;
  manageableByCurrentJobOwner: boolean;
};

export type JobApplicationPage = {
  content: JobApplication[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type CreateJobApplicationRequest = {
  coverLetter: string | null;
};

export type JobApplicationPaginationParams = {
  page?: number;
  size?: number;
  status?: JobApplicationStatus;
};

export type JobApplicationPageMetadata = Omit<JobApplicationPage, "content">;
