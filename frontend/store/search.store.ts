"use client";

import { create } from "zustand";

import { ApiError } from "@/services/api/apiClient";
import { postsService } from "@/services/api/posts.service";
import { searchService } from "@/services/api/search.service";
import { searchStateCoordinator } from "@/services/search/searchStateCoordinator";
import { useNetworkStore } from "@/store/network.store";
import { usePostsStore } from "@/store/posts.store";
import type { Job } from "@/types/jobs";
import type { Post } from "@/types/feed";
import type {
  CombinedSearchResponse,
  JobSearchParams,
  PostSearchParams,
  SearchPage,
  SearchResourceType,
  SearchUser,
  UserSearchParams,
  WorkSearchParams,
} from "@/types/search";
import type { Work } from "@/types/works";

export type SearchStatus = "idle" | "loading" | "loaded" | "error";
type Metadata = Omit<SearchPage<unknown>, "content">;
type Filters = Omit<UserSearchParams, "q" | "page" | "size">;
type State = {
  query: string;
  activeResource: SearchResourceType;
  combinedResults: CombinedSearchResponse | null;
  combinedStatus: SearchStatus;
  combinedError: ApiError | null;
  usersResults: SearchUser[];
  usersPageMetadata: Metadata | null;
  usersStatus: SearchStatus;
  usersError: ApiError | null;
  postsResults: Post[];
  postsPageMetadata: Metadata | null;
  postsStatus: SearchStatus;
  postsError: ApiError | null;
  worksResults: Work[];
  worksPageMetadata: Metadata | null;
  worksStatus: SearchStatus;
  worksError: ApiError | null;
  jobsResults: Job[];
  jobsPageMetadata: Metadata | null;
  jobsStatus: SearchStatus;
  jobsError: ApiError | null;
  userFilters: Filters;
  postFilters: Omit<PostSearchParams, "q" | "page" | "size">;
  workFilters: Omit<WorkSearchParams, "q" | "page" | "size">;
  jobFilters: Omit<JobSearchParams, "q" | "page" | "size">;
  setQuery: (query: string) => void;
  setActiveResource: (resource: SearchResourceType) => void;
  searchCombined: (query: string, limitPerType?: number) => Promise<void>;
  searchUsers: (params: UserSearchParams) => Promise<void>;
  searchPosts: (params: PostSearchParams) => Promise<void>;
  searchWorks: (params: WorkSearchParams) => Promise<void>;
  searchJobs: (params: JobSearchParams) => Promise<void>;
  setUserFilters: (filters: Filters) => void;
  setPostFilters: (filters: State["postFilters"]) => void;
  setWorkFilters: (filters: State["workFilters"]) => void;
  setJobFilters: (filters: State["jobFilters"]) => void;
  toggleFollow: (username: string) => Promise<void>;
  togglePostLike: (postId: string) => Promise<void>;
  clearSearch: () => void;
  clearErrors: () => void;
};

const requests = new Map<string, Promise<void>>();
const likeRequests = new Set<string>();
const errorOf = (error: unknown) =>
  error instanceof ApiError
    ? error
    : new ApiError(0, "NETWORK_ERROR", "Search could not be completed.");
const metadata = <T,>(page: SearchPage<T>): Metadata => ({
  page: page.page,
  size: page.size,
  totalElements: page.totalElements,
  totalPages: page.totalPages,
  first: page.first,
  last: page.last,
});
const stable = (value: object) =>
  JSON.stringify(
    Object.entries(value)
      .filter(([, item]) => item !== undefined && item !== "")
      .sort(([left], [right]) => left.localeCompare(right)),
  );

const initial = {
  query: "",
  activeResource: "all" as SearchResourceType,
  combinedResults: null,
  combinedStatus: "idle" as SearchStatus,
  combinedError: null,
  usersResults: [],
  usersPageMetadata: null,
  usersStatus: "idle" as SearchStatus,
  usersError: null,
  postsResults: [],
  postsPageMetadata: null,
  postsStatus: "idle" as SearchStatus,
  postsError: null,
  worksResults: [],
  worksPageMetadata: null,
  worksStatus: "idle" as SearchStatus,
  worksError: null,
  jobsResults: [],
  jobsPageMetadata: null,
  jobsStatus: "idle" as SearchStatus,
  jobsError: null,
  userFilters: {},
  postFilters: {},
  workFilters: {},
  jobFilters: {},
};

export const useSearchStore = create<State>()((set, get) => ({
  ...initial,
  setQuery: (query) => set({ query }),
  setActiveResource: (activeResource) => set({ activeResource }),
  setUserFilters: (userFilters) => set({ userFilters }),
  setPostFilters: (postFilters) => set({ postFilters }),
  setWorkFilters: (workFilters) => set({ workFilters }),
  setJobFilters: (jobFilters) => set({ jobFilters }),
  searchCombined(query, limitPerType = 5) {
    const params = { q: query.trim(), limitPerType };
    return run(`all:${stable(params)}`, async () => {
      set({ query: params.q, combinedStatus: "loading", combinedError: null });
      try {
        set({
          combinedResults: await searchService.searchAll(params),
          combinedStatus: "loaded",
        });
      } catch (error) {
        const mapped = errorOf(error);
        set({ combinedStatus: "error", combinedError: mapped });
        throw mapped;
      }
    });
  },
  searchUsers: (params) =>
    loadPage("users", params, searchService.searchUsers, set),
  searchPosts: (params) =>
    loadPage("posts", params, searchService.searchPosts, set),
  searchWorks: (params) =>
    loadPage("works", params, searchService.searchWorks, set),
  searchJobs: (params) =>
    loadPage("jobs", params, searchService.searchJobs, set),
  async toggleFollow(username) {
    const response = await useNetworkStore.getState().toggleFollow(username);
    set((state) => ({
      usersResults: state.usersResults.map((user) =>
        user.username === response.username
          ? {
              ...user,
              followedByCurrentUser: response.followedByCurrentUser,
              followerCount: response.followerCount,
              followingCount: response.followingCount,
            }
          : user,
      ),
      combinedResults: state.combinedResults
        ? {
            ...state.combinedResults,
            users: {
              ...state.combinedResults.users,
              content: state.combinedResults.users.content.map((user) =>
                user.username === response.username
                  ? {
                      ...user,
                      followedByCurrentUser: response.followedByCurrentUser,
                      followerCount: response.followerCount,
                      followingCount: response.followingCount,
                    }
                  : user,
              ),
            },
          }
        : null,
    }));
  },
  async togglePostLike(postId) {
    if (likeRequests.has(postId)) return;
    const post =
      get().postsResults.find((item) => item.id === postId) ??
      get().combinedResults?.posts.content.find((item) => item.id === postId);
    if (!post) return;
    likeRequests.add(postId);
    let response;
    try {
      response = post.likedByCurrentUser
        ? await postsService.unlike(postId)
        : await postsService.like(postId);
    } finally {
      likeRequests.delete(postId);
    }
    const update = (item: Post) =>
      item.id === postId
        ? {
            ...item,
            likedByCurrentUser: response.likedByCurrentUser,
            likeCount: Math.max(0, response.likeCount),
          }
        : item;
    set((state) => ({
      postsResults: state.postsResults.map(update),
      combinedResults: state.combinedResults
        ? {
            ...state.combinedResults,
            posts: {
              ...state.combinedResults.posts,
              content: state.combinedResults.posts.content.map(update),
            },
          }
        : null,
    }));
    usePostsStore.setState((state) => ({
      globalPosts: state.globalPosts.map(update),
      myPosts: state.myPosts.map(update),
    }));
  },
  clearSearch: () => {
    requests.clear();
    set(initial);
  },
  clearErrors: () =>
    set({
      combinedError: null,
      usersError: null,
      postsError: null,
      worksError: null,
      jobsError: null,
    }),
}));

function run(key: string, operation: () => Promise<void>): Promise<void> {
  const existing = requests.get(key);
  if (existing) return existing;
  const request = operation().finally(() => requests.delete(key));
  requests.set(key, request);
  return request;
}

function loadPage<T, P extends { q: string }>(
  kind: "users" | "posts" | "works" | "jobs",
  params: P,
  loader: (params: P) => Promise<SearchPage<T>>,
  set: (partial: Partial<State> | ((state: State) => Partial<State>)) => void,
): Promise<void> {
  const normalized = { ...params, q: params.q.trim() };
  return run(`${kind}:${stable(normalized)}`, async () => {
    set({
      query: normalized.q,
      activeResource: kind,
      [`${kind}Status`]: "loading",
      [`${kind}Error`]: null,
    } as Partial<State>);
    try {
      const page = await loader(normalized);
      set({
        [`${kind}Results`]: page.content,
        [`${kind}PageMetadata`]: metadata(page),
        [`${kind}Status`]: "loaded",
      } as Partial<State>);
    } catch (error) {
      const mapped = errorOf(error);
      set({
        [`${kind}Status`]: "error",
        [`${kind}Error`]: mapped,
      } as Partial<State>);
      throw mapped;
    }
  });
}

searchStateCoordinator.configure((authenticated) => {
  useSearchStore.setState((state) => ({
    combinedResults: state.combinedResults
      ? {
          ...state.combinedResults,
          users: {
            ...state.combinedResults.users,
            content: state.combinedResults.users.content.map((user) => ({
              ...user,
              followedByCurrentUser: false,
            })),
          },
          posts: {
            ...state.combinedResults.posts,
            content: state.combinedResults.posts.content.map((post) => ({
              ...post,
              likedByCurrentUser: false,
              ownedByCurrentUser: false,
            })),
          },
          works: {
            ...state.combinedResults.works,
            content: state.combinedResults.works.content.map((work) => ({
              ...work,
              ownedByCurrentUser: false,
            })),
          },
          jobs: {
            ...state.combinedResults.jobs,
            content: state.combinedResults.jobs.content.map((job) => ({
              ...job,
              ownedByCurrentUser: false,
            })),
          },
        }
      : null,
    usersResults: state.usersResults.map((user) => ({
      ...user,
      followedByCurrentUser: false,
    })),
    postsResults: state.postsResults.map((post) => ({
      ...post,
      likedByCurrentUser: false,
      ownedByCurrentUser: false,
    })),
    worksResults: state.worksResults.map((work) => ({
      ...work,
      ownedByCurrentUser: false,
    })),
    jobsResults: state.jobsResults.map((job) => ({
      ...job,
      ownedByCurrentUser: false,
    })),
    combinedStatus: authenticated && state.combinedResults ? "idle" : state.combinedStatus,
    usersStatus: authenticated && state.usersResults.length ? "idle" : state.usersStatus,
    postsStatus: authenticated && state.postsResults.length ? "idle" : state.postsStatus,
    worksStatus: authenticated && state.worksResults.length ? "idle" : state.worksStatus,
    jobsStatus: authenticated && state.jobsResults.length ? "idle" : state.jobsStatus,
  }));
});
