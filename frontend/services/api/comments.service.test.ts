import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiRequest } from "@/services/api/apiClient";
import { commentsService } from "@/services/api/comments.service";

vi.mock("@/services/api/apiClient", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/services/api/apiClient")>();
  return { ...original, apiRequest: vi.fn() };
});

const request = vi.mocked(apiRequest);

describe("commentsService", () => {
  beforeEach(() => request.mockReset());

  it("maps comment listing and supplied pagination", async () => {
    request.mockResolvedValueOnce({});
    await commentsService.getByPost("post/id", { page: 2, size: 10 });
    expect(request).toHaveBeenCalledWith(
      "/posts/post%2Fid/comments?page=2&size=10",
      { authenticated: true },
    );
  });

  it("omits pagination values that were not supplied", async () => {
    request.mockResolvedValueOnce({});
    await commentsService.getByPost("post-id");
    expect(request).toHaveBeenCalledWith("/posts/post-id/comments", {
      authenticated: true,
    });
  });

  it("maps comment creation", async () => {
    request.mockResolvedValueOnce({});
    await commentsService.create("post/id", { content: "Comment" });
    expect(request).toHaveBeenCalledWith("/posts/post%2Fid/comments", {
      method: "POST",
      authenticated: true,
      body: { content: "Comment" },
    });
  });

  it("maps deletion and handles a 204 response", async () => {
    request.mockResolvedValueOnce(undefined);
    await expect(commentsService.delete("comment/id")).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledWith("/comments/comment%2Fid", {
      method: "DELETE",
      authenticated: true,
    });
  });

  it("preserves structured errors", async () => {
    const error = new ApiError(404, "COMMENT_NOT_FOUND", "Missing");
    request.mockRejectedValueOnce(error);
    await expect(commentsService.delete("missing")).rejects.toBe(error);
  });
});
