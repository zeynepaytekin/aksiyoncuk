import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiRequest } from "@/services/api/apiClient";
import { postsService } from "@/services/api/posts.service";

vi.mock("@/services/api/apiClient", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/services/api/apiClient")>();
  return { ...original, apiRequest: vi.fn() };
});

const request = vi.mocked(apiRequest);

describe("postsService", () => {
  beforeEach(() => request.mockReset());

  it("maps the public feed and supplied pagination", async () => {
    request.mockResolvedValueOnce({});
    await postsService.getGlobal({ page: 2, size: 10 });
    expect(request).toHaveBeenCalledWith("/posts?page=2&size=10", {
      authenticated: true,
    });
  });

  it("omits pagination parameters that were not supplied", async () => {
    request.mockResolvedValueOnce({});
    await postsService.getGlobal();
    expect(request).toHaveBeenCalledWith("/posts", { authenticated: true });
  });

  it("maps the authenticated current-user feed", async () => {
    request.mockResolvedValueOnce({});
    await postsService.getMine({ page: 1 });
    expect(request).toHaveBeenCalledWith("/posts/me?page=1", {
      authenticated: true,
    });
  });

  it("maps post creation without changing content", async () => {
    request.mockResolvedValueOnce({});
    await postsService.create({ content: "A post" });
    expect(request).toHaveBeenCalledWith("/posts", {
      method: "POST",
      body: { content: "A post" },
      authenticated: true,
    });
  });

  it("maps deletion and supports a 204 response", async () => {
    request.mockResolvedValueOnce(undefined);
    await expect(postsService.delete("post/id")).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledWith("/posts/post%2Fid", {
      method: "DELETE",
      authenticated: true,
    });
  });

  it("preserves structured API errors", async () => {
    const error = new ApiError(400, "INVALID_PAGINATION", "Invalid page");
    request.mockRejectedValueOnce(error);
    await expect(postsService.getGlobal({ page: -1 })).rejects.toBe(error);
  });
});
