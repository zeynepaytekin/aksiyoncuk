import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/services/api/apiClient";
import { searchService } from "@/services/api/search.service";
import { useSearchStore } from "@/store/search.store";
import type { CombinedSearchResponse, SearchPage, SearchUser } from "@/types/search";

vi.mock("@/services/api/search.service", () => ({
  searchService: {
    searchAll: vi.fn(),
    searchUsers: vi.fn(),
    searchPosts: vi.fn(),
    searchWorks: vi.fn(),
    searchJobs: vi.fn(),
  },
}));

const person: SearchUser = {
  id: "user-1",
  username: "editor",
  fullName: "Editor User",
  professionalTitle: "Editor",
  location: "Istanbul",
  followerCount: 2,
  followingCount: 3,
  followedByCurrentUser: true,
};
const page: SearchPage<SearchUser> = {
  content: [person],
  page: 1,
  size: 10,
  totalElements: 11,
  totalPages: 2,
  first: false,
  last: true,
};
const combined: CombinedSearchResponse = {
  query: "editor",
  users: { content: [person], totalElements: 1 },
  posts: { content: [], totalElements: 0 },
  works: { content: [], totalElements: 0 },
  jobs: { content: [], totalElements: 0 },
};

describe("search store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchStore.getState().clearSearch();
  });

  it("loads combined and separate user pagination", async () => {
    vi.mocked(searchService.searchAll).mockResolvedValue(combined);
    vi.mocked(searchService.searchUsers).mockResolvedValue(page);
    await useSearchStore.getState().searchCombined(" editor ");
    await useSearchStore
      .getState()
      .searchUsers({ q: "editor", page: 1, size: 10 });
    expect(useSearchStore.getState().combinedResults).toEqual(combined);
    expect(useSearchStore.getState().usersResults).toEqual([person]);
    expect(useSearchStore.getState().usersPageMetadata?.page).toBe(1);
    expect(useSearchStore.getState().query).toBe("editor");
  });

  it("deduplicates identical requests and records failures", async () => {
    let resolve!: (value: SearchPage<SearchUser>) => void;
    vi.mocked(searchService.searchUsers).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const first = useSearchStore.getState().searchUsers({ q: "editor" });
    const second = useSearchStore.getState().searchUsers({ q: "editor" });
    expect(searchService.searchUsers).toHaveBeenCalledTimes(1);
    resolve(page);
    await Promise.all([first, second]);

    useSearchStore.getState().clearSearch();
    vi.mocked(searchService.searchUsers).mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "offline"),
    );
    await expect(
      useSearchStore.getState().searchUsers({ q: "editor" }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(useSearchStore.getState().usersStatus).toBe("error");
  });

  it("keeps filters separate and clears all search state", () => {
    useSearchStore.getState().setQuery("editor");
    useSearchStore.getState().setPostFilters({ authorUsername: "creator" });
    useSearchStore.getState().setWorkFilters({ workType: "SHORT_FILM" });
    useSearchStore.getState().setJobFilters({ status: "CLOSED" });
    expect(useSearchStore.getState().postFilters.authorUsername).toBe("creator");
    useSearchStore.getState().clearSearch();
    expect(useSearchStore.getState().query).toBe("");
    expect(useSearchStore.getState().postFilters).toEqual({});
  });
});
