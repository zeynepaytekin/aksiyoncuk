import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiRequest } from "@/services/api/apiClient";
import { searchService } from "@/services/api/search.service";

vi.mock("@/services/api/apiClient", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/services/api/apiClient")>();
  return { ...original, apiRequest: vi.fn() };
});

const request = vi.mocked(apiRequest);

describe("search service", () => {
  beforeEach(() => request.mockReset());

  it("trims and encodes combined and user queries", async () => {
    request.mockResolvedValue({});
    await searchService.searchAll({ q: "  editor & film  ", limitPerType: 4 });
    await searchService.searchUsers({ q: " director ", page: 2, size: 10 });
    expect(request).toHaveBeenNthCalledWith(
      1,
      "/search?q=editor+%26+film&limitPerType=4",
      { authenticated: true },
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      "/search/users?q=director&page=2&size=10",
      { authenticated: true },
    );
  });

  it("serializes resource filters and omits absent values", async () => {
    request.mockResolvedValue({});
    await searchService.searchPosts({ q: "post", authorUsername: "creator" });
    await searchService.searchWorks({
      q: "film",
      workType: "SHORT_FILM",
      releaseYear: 2026,
    });
    await searchService.searchJobs({
      q: "editor",
      category: "PROFESSIONAL",
      workMode: "REMOTE",
      status: "OPEN",
      compensationType: "FIXED",
    });
    expect(request.mock.calls[0][0]).toBe(
      "/search/posts?q=post&authorUsername=creator",
    );
    expect(request.mock.calls[1][0]).toBe(
      "/search/works?q=film&workType=SHORT_FILM&releaseYear=2026",
    );
    expect(request.mock.calls[2][0]).toContain(
      "/search/jobs?q=editor&category=PROFESSIONAL",
    );
  });

  it("preserves structured errors", async () => {
    request.mockImplementationOnce(() =>
      Promise.reject(new ApiError(400, "INVALID_SEARCH_FILTER", "invalid")),
    );
    await expect(searchService.searchJobs({ q: "editor" })).rejects.toMatchObject(
      { code: "INVALID_SEARCH_FILTER", status: 400 },
    );
  });
});
