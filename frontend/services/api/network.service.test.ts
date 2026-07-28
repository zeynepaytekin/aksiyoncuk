import { beforeEach, describe, expect, it, vi } from "vitest";
import { networkService, normalizeNetworkUsername } from "@/services/api/network.service";

const request = vi.fn();
vi.mock("@/services/api/apiClient", () => ({
  apiRequest: (...args: unknown[]) => request(...args),
}));

describe("network service", () => {
  beforeEach(() => request.mockReset());

  it("normalizes usernames and maps follow/unfollow", async () => {
    request.mockResolvedValue({});
    expect(normalizeNetworkUsername(" Creative.User ")).toBe("creative.user");
    await networkService.follow(" User/Name ");
    await networkService.unfollow(" User/Name ");
    expect(request).toHaveBeenNthCalledWith(1, "/users/user%2Fname/follow", {
      method: "PUT", authenticated: true,
    });
    expect(request).toHaveBeenNthCalledWith(2, "/users/user%2Fname/follow", {
      method: "DELETE", authenticated: true,
    });
  });

  it("maps follower and following pagination", async () => {
    request.mockResolvedValue({});
    await networkService.getFollowers("Person", { page: 1, size: 10 });
    await networkService.getFollowing("Person");
    expect(request).toHaveBeenNthCalledWith(
      1, "/users/person/followers?page=1&size=10", { authenticated: true },
    );
    expect(request).toHaveBeenNthCalledWith(
      2, "/users/person/following", { authenticated: true },
    );
  });

  it("maps the private summary", async () => {
    request.mockResolvedValue({});
    await networkService.getMySummary();
    expect(request).toHaveBeenCalledWith("/network/me", { authenticated: true });
  });
});
