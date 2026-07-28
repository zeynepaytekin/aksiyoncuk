export const JOB_CATEGORY_VALUES = ["VOLUNTEER", "STUDENT", "AMATEUR", "PROFESSIONAL"] as const;
export const WORK_MODE_VALUES = ["ONSITE", "REMOTE", "HYBRID"] as const;
export const COMPENSATION_TYPE_VALUES = ["UNPAID", "FIXED", "NEGOTIABLE"] as const;
export const JOB_STATUS_VALUES = ["OPEN", "CLOSED"] as const;

export type JobCategory = (typeof JOB_CATEGORY_VALUES)[number];
export type WorkMode = (typeof WORK_MODE_VALUES)[number];
export type CompensationType = (typeof COMPENSATION_TYPE_VALUES)[number];
export type JobStatus = (typeof JOB_STATUS_VALUES)[number];

export type JobOwner = {
  id: string;
  username: string;
  fullName: string;
  professionalTitle: string | null;
};

export type Job = {
  id: string;
  title: string;
  description: string;
  category: JobCategory;
  workMode: WorkMode;
  location: string | null;
  compensationType: CompensationType;
  compensationAmount: number | null;
  currency: string | null;
  status: JobStatus;
  applicationDeadline: string | null;
  createdAt: string;
  updatedAt: string;
  owner: JobOwner;
  ownedByCurrentUser: boolean;
  applicationCount: number;
};

export type JobPage = {
  content: Job[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type CreateJobRequest = {
  title: string;
  description: string;
  category: JobCategory;
  workMode: WorkMode;
  location: string | null;
  compensationType: CompensationType;
  compensationAmount: number | null;
  currency: string | null;
  applicationDeadline: string | null;
};

export type UpdateJobRequest = {
  title?: string;
  description?: string;
  category?: JobCategory;
  workMode?: WorkMode;
  location?: string | null;
  compensationType?: CompensationType;
  compensationAmount?: number | null;
  currency?: string | null;
  applicationDeadline?: string | null;
};

export type JobFilters = {
  status?: JobStatus;
  category?: JobCategory;
  workMode?: WorkMode;
};

export type JobPaginationParams = JobFilters & { page?: number; size?: number };
export type JobPageMetadata = Omit<JobPage, "content">;
