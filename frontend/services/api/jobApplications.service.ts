import { apiRequest } from "@/services/api/apiClient";
import type {
  CreateJobApplicationRequest,
  JobApplication,
  JobApplicationPage,
  JobApplicationPaginationParams,
} from "@/types/jobApplications";

function query(params?: JobApplicationPaginationParams): string {
  const search = new URLSearchParams();
  if (params?.page !== undefined) search.set("page", String(params.page));
  if (params?.size !== undefined) search.set("size", String(params.size));
  if (params?.status !== undefined) search.set("status", params.status);
  const value = search.toString();
  return value ? `?${value}` : "";
}

export const jobApplicationsService = {
  apply(
    jobId: string,
    request: CreateJobApplicationRequest,
  ): Promise<JobApplication> {
    return apiRequest(
      `/jobs/${encodeURIComponent(jobId)}/applications`,
      { method: "POST", authenticated: true, body: request },
    );
  },
  getMine(
    params?: JobApplicationPaginationParams,
  ): Promise<JobApplicationPage> {
    return apiRequest(`/job-applications/me${query(params)}`, {
      authenticated: true,
    });
  },
  getForJob(
    jobId: string,
    params?: JobApplicationPaginationParams,
  ): Promise<JobApplicationPage> {
    return apiRequest(
      `/jobs/${encodeURIComponent(jobId)}/applications${query(params)}`,
      { authenticated: true },
    );
  },
  getById(applicationId: string): Promise<JobApplication> {
    return apiRequest(
      `/job-applications/${encodeURIComponent(applicationId)}`,
      { authenticated: true },
    );
  },
  withdraw(applicationId: string): Promise<JobApplication> {
    return transition(applicationId, "withdraw");
  },
  accept(applicationId: string): Promise<JobApplication> {
    return transition(applicationId, "accept");
  },
  reject(applicationId: string): Promise<JobApplication> {
    return transition(applicationId, "reject");
  },
};

function transition(
  applicationId: string,
  action: "withdraw" | "accept" | "reject",
): Promise<JobApplication> {
  return apiRequest(
    `/job-applications/${encodeURIComponent(applicationId)}/${action}`,
    { method: "POST", authenticated: true },
  );
}

export type JobApplicationsService = typeof jobApplicationsService;
