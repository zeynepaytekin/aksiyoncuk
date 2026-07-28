import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/api/apiClient";
import { networkService } from "@/services/api/network.service";
import { useNetworkStore } from "@/store/network.store";
import { useProfileStore } from "@/store/profile.store";
import type { NetworkPage } from "@/types/network";
import type { PublicProfile } from "@/types/profile";

vi.mock("@/services/api/network.service", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/services/api/network.service")>();
  return { ...original, networkService: {
    follow: vi.fn(), unfollow: vi.fn(), getFollowers: vi.fn(),
    getFollowing: vi.fn(), getMySummary: vi.fn(),
  } };
});

const profile: PublicProfile = {
  id: "profile", userId: "target", username: "target", fullName: "Target",
  status: "ACTIVE", professionalTitle: null, bio: null, location: null,
  websiteUrl: null, createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z", followerCount: 4,
  followingCount: 2, followedByCurrentUser: false,
};
const page: NetworkPage = {
  content: [{ id: "target", username: "target", fullName: "Target",
    professionalTitle: null, followedByCurrentUser: false }],
  page: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true,
};

describe("network store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNetworkStore.getState().clearPrivateNetwork();
    useNetworkStore.getState().clearPublicNetwork();
    useProfileStore.setState({
      publicProfiles: { target: profile },
      publicProfileStatuses: { target: "loaded" },
    });
  });

  it("loads summary success and failure", async () => {
    vi.mocked(networkService.getMySummary).mockResolvedValue({
      followerCount: 1, followingCount: 2, mutualCount: 1,
    });
    await useNetworkStore.getState().loadMySummary();
    expect(useNetworkStore.getState().summary?.mutualCount).toBe(1);
    useNetworkStore.setState({ summaryStatus: "idle", summary: null });
    vi.mocked(networkService.getMySummary).mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "offline"),
    );
    await expect(useNetworkStore.getState().loadMySummary()).rejects.toBeInstanceOf(ApiError);
    expect(useNetworkStore.getState().summaryStatus).toBe("error");
  });

  it("loads lists and prevents duplicate requests", async () => {
    let resolve!: (value: NetworkPage) => void;
    vi.mocked(networkService.getFollowers).mockReturnValue(
      new Promise((done) => { resolve = done; }),
    );
    const first = useNetworkStore.getState().loadFollowers("Target");
    const second = useNetworkStore.getState().loadFollowers("target");
    expect(networkService.getFollowers).toHaveBeenCalledTimes(1);
    resolve(page);
    await Promise.all([first, second]);
    vi.mocked(networkService.getFollowing).mockResolvedValue(page);
    await useNetworkStore.getState().loadFollowing("target");
    expect(useNetworkStore.getState().followersByUsername.target).toEqual(page.content);
    expect(useNetworkStore.getState().followingByUsername.target).toEqual(page.content);
  });

  it("optimistically follows then settles profile and loaded lists", async () => {
    useNetworkStore.setState({
      summary: { followerCount: 0, followingCount: 3, mutualCount: 0 },
      followersByUsername: { someone: page.content },
    });
    let resolve!: (value: {
      userId: string; username: string; followedByCurrentUser: boolean;
      followerCount: number; followingCount: number;
    }) => void;
    vi.mocked(networkService.follow).mockReturnValue(new Promise((done) => { resolve = done; }));
    const pending = useNetworkStore.getState().followUser("target");
    expect(useProfileStore.getState().publicProfiles.target.followerCount).toBe(5);
    expect(useNetworkStore.getState().summary?.followingCount).toBe(4);
    expect(useNetworkStore.getState().followersByUsername.someone[0].followedByCurrentUser).toBe(true);
    resolve({ userId: "target", username: "target", followedByCurrentUser: true,
      followerCount: 8, followingCount: 2 });
    await pending;
    expect(useProfileStore.getState().publicProfiles.target.followerCount).toBe(8);
  });

  it("rolls back the exact profile, lists, and summary on failure", async () => {
    useNetworkStore.setState({
      summary: { followerCount: 0, followingCount: 3, mutualCount: 0 },
      followersByUsername: { someone: page.content },
    });
    vi.mocked(networkService.follow).mockRejectedValue(
      new ApiError(500, "NETWORK_ERROR", "failure"),
    );
    await expect(useNetworkStore.getState().followUser("target")).rejects.toBeInstanceOf(ApiError);
    expect(useProfileStore.getState().publicProfiles.target).toEqual(profile);
    expect(useNetworkStore.getState().summary?.followingCount).toBe(3);
    expect(useNetworkStore.getState().followersByUsername.someone).toEqual(page.content);
  });

  it("optimistic unfollow never drops a count below zero and cleanup clears private state", async () => {
    useProfileStore.setState({
      publicProfiles: { target: { ...profile, followerCount: 0, followedByCurrentUser: true } },
    });
    vi.mocked(networkService.unfollow).mockResolvedValue({
      userId: "target", username: "target", followedByCurrentUser: false,
      followerCount: 0, followingCount: 2,
    });
    await useNetworkStore.getState().unfollowUser("target");
    expect(useProfileStore.getState().publicProfiles.target.followerCount).toBe(0);
    useNetworkStore.getState().clearPrivateNetwork();
    expect(useNetworkStore.getState().summary).toBeNull();
    expect(useNetworkStore.getState().followStatusByUsername).toEqual({});
  });
});
