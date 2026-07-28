import { apiRequest } from "@/services/api/apiClient";
import type { Job } from "@/types/jobs";
import type { Post } from "@/types/feed";
import type {
  CombinedSearchParams,
  CombinedSearchResponse,
  JobSearchParams,
  PostSearchParams,
  SearchPage,
  SearchUser,
  UserSearchParams,
  WorkSearchParams,
} from "@/types/search";
import type { Work } from "@/types/works";

function query(params: Record<string, unknown>): string {
  const values = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      values.set(key, String(value));
    }
  });
  return values.toString();
}

function normalized<T extends { q: string }>(params: T): T {
  return { ...params, q: params.q.trim() };
}

export const searchService = {
  searchAll(params: CombinedSearchParams): Promise<CombinedSearchResponse> {
    return apiRequest(`/search?${query(normalized(params))}`, {
      authenticated: true,
    });
  },
  searchUsers(params: UserSearchParams): Promise<SearchPage<SearchUser>> {
    return apiRequest(`/search/users?${query(normalized(params))}`, {
      authenticated: true,
    });
  },
  searchPosts(params: PostSearchParams): Promise<SearchPage<Post>> {
    return apiRequest(`/search/posts?${query(normalized(params))}`, {
      authenticated: true,
    });
  },
  searchWorks(params: WorkSearchParams): Promise<SearchPage<Work>> {
    return apiRequest(`/search/works?${query(normalized(params))}`, {
      authenticated: true,
    });
  },
  searchJobs(params: JobSearchParams): Promise<SearchPage<Job>> {
    return apiRequest(`/search/jobs?${query(normalized(params))}`, {
      authenticated: true,
    });
  },
};
