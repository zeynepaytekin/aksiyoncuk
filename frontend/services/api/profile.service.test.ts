import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiRequest } from "@/services/api/apiClient";
import { profileService } from "@/services/api/profile.service";

vi.mock("@/services/api/apiClient", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/services/api/apiClient")>();
  return { ...original, apiRequest: vi.fn() };
});

const request = vi.mocked(apiRequest);

describe("profileService", () => {
  beforeEach(() => request.mockReset());

  it("maps the authenticated current-profile request", async () => {
    request.mockResolvedValueOnce({});
    await profileService.getCurrent();
    expect(request).toHaveBeenCalledWith("/profiles/me", {
      authenticated: true,
    });
  });

  it("sends PATCH values while omitting undefined and preserving null", async () => {
    request.mockResolvedValueOnce({});
    await profileService.updateCurrent({
      fullName: undefined,
      bio: null,
      location: "Bucharest",
    });
    expect(request).toHaveBeenCalledWith("/profiles/me", {
      method: "PATCH",
      authenticated: true,
      body: { bio: null, location: "Bucharest" },
    });
  });

  it("safely encodes a public username", async () => {
    request.mockResolvedValueOnce({});
    await profileService.getPublicByUsername("user/name");
    expect(request).toHaveBeenCalledWith("/profiles/user%2Fname");
  });

  it("preserves typed API errors", async () => {
    const error = new ApiError(404, "PROFILE_NOT_FOUND", "Missing");
    request.mockRejectedValueOnce(error);
    await expect(profileService.getPublicByUsername("missing")).rejects.toBe(
      error,
    );
  });
});
