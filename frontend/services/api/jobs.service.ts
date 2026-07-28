import { apiRequest } from "@/services/api/apiClient";
import type { CreateJobRequest, Job, JobPage, JobPaginationParams, UpdateJobRequest } from "@/types/jobs";

function query(params?: JobPaginationParams): string {
  const search = new URLSearchParams();
  if (params?.page !== undefined) search.set("page", String(params.page));
  if (params?.size !== undefined) search.set("size", String(params.size));
  if (params?.status !== undefined) search.set("status", params.status);
  if (params?.category !== undefined) search.set("category", params.category);
  if (params?.workMode !== undefined) search.set("workMode", params.workMode);
  const value = search.toString();
  return value ? `?${value}` : "";
}

function patchBody(request: UpdateJobRequest): UpdateJobRequest {
  return Object.fromEntries(Object.entries(request).filter(([, value]) => value !== undefined)) as UpdateJobRequest;
}

export const jobsService = {
  getGlobal(params?: JobPaginationParams): Promise<JobPage> {
    return apiRequest(`/jobs${query(params)}`, { authenticated: true });
  },
  getMine(params?: JobPaginationParams): Promise<JobPage> {
    return apiRequest(`/jobs/me${query(params)}`, { authenticated: true });
  },
  getById(jobId: string): Promise<Job> {
    return apiRequest(`/jobs/${encodeURIComponent(jobId)}`, { authenticated: true });
  },
  create(request: CreateJobRequest): Promise<Job> {
    return apiRequest("/jobs", { method: "POST", authenticated: true, body: request });
  },
  update(jobId: string, request: UpdateJobRequest): Promise<Job> {
    return apiRequest(`/jobs/${encodeURIComponent(jobId)}`, {
      method: "PATCH", authenticated: true, body: patchBody(request),
    });
  },
  close(jobId: string): Promise<Job> {
    return apiRequest(`/jobs/${encodeURIComponent(jobId)}/close`, { method: "POST", authenticated: true });
  },
  reopen(jobId: string): Promise<Job> {
    return apiRequest(`/jobs/${encodeURIComponent(jobId)}/reopen`, { method: "POST", authenticated: true });
  },
  delete(jobId: string): Promise<void> {
    return apiRequest(`/jobs/${encodeURIComponent(jobId)}`, { method: "DELETE", authenticated: true });
  },
};

export type JobsService = typeof jobsService;
