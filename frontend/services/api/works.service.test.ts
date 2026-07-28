import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiRequest } from "@/services/api/apiClient";
import { worksService } from "@/services/api/works.service";

vi.mock("@/services/api/apiClient", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/services/api/apiClient")>();
  return { ...original, apiRequest: vi.fn() };
});

const request = vi.mocked(apiRequest);

describe("worksService", () => {
  beforeEach(() => request.mockReset());

  it("maps current-user works with pagination", async () => {
    request.mockResolvedValueOnce({});
    await worksService.getMine({ page: 2, size: 10 });
    expect(request).toHaveBeenCalledWith("/works/me?page=2&size=10", {
      authenticated: true,
    });
  });

  it("encodes public usernames and partial pagination", async () => {
    request.mockResolvedValueOnce({});
    await worksService.getPublicByUsername("user/name", { size: 5 });
    expect(request).toHaveBeenCalledWith(
      "/users/user%2Fname/works?size=5",
      { authenticated: true },
    );
  });

  it("maps an encoded single-work request", async () => {
    request.mockResolvedValueOnce({});
    await worksService.getById("work/id");
    expect(request).toHaveBeenCalledWith("/works/work%2Fid", {
      authenticated: true,
    });
  });

  it("maps creation", async () => {
    request.mockResolvedValueOnce({});
    const body = {
      title: "Film",
      description: null,
      workType: "FILM" as const,
      projectUrl: null,
      releaseYear: null,
    };
    await worksService.create(body);
    expect(request).toHaveBeenCalledWith("/works", {
      method: "POST",
      authenticated: true,
      body,
    });
  });

  it("omits undefined PATCH fields while preserving explicit null", async () => {
    request.mockResolvedValueOnce({});
    await worksService.update("work/id", {
      title: undefined,
      description: null,
      releaseYear: 2026,
    });
    expect(request).toHaveBeenCalledWith("/works/work%2Fid", {
      method: "PATCH",
      authenticated: true,
      body: { description: null, releaseYear: 2026 },
    });
  });

  it("maps deletion and its 204 response", async () => {
    request.mockResolvedValueOnce(undefined);
    await expect(worksService.delete("work/id")).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledWith("/works/work%2Fid", {
      method: "DELETE",
      authenticated: true,
    });
  });

  it("preserves structured errors", async () => {
    const error = new ApiError(404, "WORK_NOT_FOUND", "Missing");
    request.mockRejectedValueOnce(error);
    await expect(worksService.getById("missing")).rejects.toBe(error);
  });
});
