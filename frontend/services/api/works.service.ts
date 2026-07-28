import { apiRequest } from "@/services/api/apiClient";
import type {
  CreateWorkRequest,
  UpdateWorkRequest,
  Work,
  WorkPage,
  WorkPaginationParams,
} from "@/types/works";

function paginationQuery(params?: WorkPaginationParams): string {
  const search = new URLSearchParams();
  if (params?.page !== undefined) search.set("page", String(params.page));
  if (params?.size !== undefined) search.set("size", String(params.size));
  const query = search.toString();
  return query ? `?${query}` : "";
}

function definedPatch(request: UpdateWorkRequest): UpdateWorkRequest {
  return Object.fromEntries(
    Object.entries(request).filter(([, value]) => value !== undefined),
  ) as UpdateWorkRequest;
}

export const worksService = {
  getMine(params?: WorkPaginationParams): Promise<WorkPage> {
    return apiRequest(`/works/me${paginationQuery(params)}`, {
      authenticated: true,
    });
  },

  getPublicByUsername(
    username: string,
    params?: WorkPaginationParams,
  ): Promise<WorkPage> {
    return apiRequest(
      `/users/${encodeURIComponent(username)}/works${paginationQuery(params)}`,
      { authenticated: true },
    );
  },

  getById(workId: string): Promise<Work> {
    return apiRequest(`/works/${encodeURIComponent(workId)}`, {
      authenticated: true,
    });
  },

  create(request: CreateWorkRequest): Promise<Work> {
    return apiRequest("/works", {
      method: "POST",
      authenticated: true,
      body: request,
    });
  },

  update(workId: string, request: UpdateWorkRequest): Promise<Work> {
    return apiRequest(`/works/${encodeURIComponent(workId)}`, {
      method: "PATCH",
      authenticated: true,
      body: definedPatch(request),
    });
  },

  delete(workId: string): Promise<void> {
    return apiRequest(`/works/${encodeURIComponent(workId)}`, {
      method: "DELETE",
      authenticated: true,
    });
  },
};

export type WorksService = typeof worksService;
