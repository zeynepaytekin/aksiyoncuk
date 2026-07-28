import type { Post } from "./feed";
import type {
  CompensationType,
  Job,
  JobCategory,
  JobStatus,
  WorkMode,
} from "./jobs";
import type { Work, WorkType } from "./works";

export type SearchResourceType = "all" | "users" | "posts" | "works" | "jobs";

export type SearchUser = {
  id: string;
  username: string;
  fullName: string;
  professionalTitle: string | null;
  location: string | null;
  followerCount: number;
  followingCount: number;
  followedByCurrentUser: boolean;
};

export type SearchPage<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type SearchGroup<T> = { content: T[]; totalElements: number };

export type CombinedSearchResponse = {
  query: string;
  users: SearchGroup<SearchUser>;
  posts: SearchGroup<Post>;
  works: SearchGroup<Work>;
  jobs: SearchGroup<Job>;
};

export type SearchPaginationParams = { q: string; page?: number; size?: number };
export type UserSearchParams = SearchPaginationParams;
export type PostSearchParams = SearchPaginationParams & { authorUsername?: string };
export type WorkSearchParams = SearchPaginationParams & {
  workType?: WorkType;
  ownerUsername?: string;
  releaseYear?: number;
};
export type JobSearchParams = SearchPaginationParams & {
  category?: JobCategory;
  workMode?: WorkMode;
  status?: JobStatus;
  compensationType?: CompensationType;
  ownerUsername?: string;
};
export type CombinedSearchParams = { q: string; limitPerType?: number };
