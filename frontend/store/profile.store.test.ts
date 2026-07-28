import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/services/api/apiClient";
import { profileService } from "@/services/api/profile.service";
import { useAuthStore } from "@/store/auth.store";
import { useProfileStore } from "@/store/profile.store";
import type { CurrentProfile, PublicProfile } from "@/types/profile";

vi.mock("@/services/api/profile.service", () => ({
  profileService: {
    getCurrent: vi.fn(),
    updateCurrent: vi.fn(),
    getPublicByUsername: vi.fn(),
  },
}));
vi.mock("@/store/auth.store", () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}));

const current: CurrentProfile = {
  id: "profile-id",
  user: {
    id: "user-id",
    email: "user@example.com",
    username: "creativeuser",
    fullName: "Creative User",
    status: "ACTIVE",
    createdAt: "2030-01-01T00:00:00Z",
  },
  professionalTitle: "Director",
  bio: "Biography",
  location: "Bucharest",
  websiteUrl: "https://example.com",
  createdAt: "2030-01-01T00:00:00Z",
  updatedAt: "2030-01-01T00:00:00Z",
};

const publicProfile: PublicProfile = {
  id: "profile-id",
  userId: "user-id",
  username: "creativeuser",
  fullName: "Creative User",
  status: "ACTIVE",
  professionalTitle: "Director",
  bio: null,
  location: null,
  websiteUrl: null,
  createdAt: "2030-01-01T00:00:00Z",
  updatedAt: "2030-01-01T00:00:00Z",
};

describe("profile store", () => {
  beforeEach(() => {
    vi.mocked(profileService.getCurrent).mockReset();
    vi.mocked(profileService.updateCurrent).mockReset();
    vi.mocked(profileService.getPublicByUsername).mockReset();
    useProfileStore.getState().clearAllProfileState();
  });

  it("loads the current profile", async () => {
    vi.mocked(profileService.getCurrent).mockResolvedValue(current);
    await useProfileStore.getState().loadCurrentProfile();
    expect(useProfileStore.getState().currentProfile).toEqual(current);
    expect(useProfileStore.getState().currentProfileStatus).toBe("loaded");
  });

  it("records a current-profile failure", async () => {
    vi.mocked(profileService.getCurrent).mockRejectedValue(
      new ApiError(500, "FAILED", "Failed"),
    );
    await expect(
      useProfileStore.getState().loadCurrentProfile(),
    ).rejects.toMatchObject({ code: "FAILED" });
    expect(useProfileStore.getState().currentProfileStatus).toBe("error");
  });

  it("deduplicates concurrent current-profile loads", async () => {
    let resolve!: (profile: CurrentProfile) => void;
    vi.mocked(profileService.getCurrent).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const first = useProfileStore.getState().loadCurrentProfile();
    const second = useProfileStore.getState().loadCurrentProfile();
    expect(profileService.getCurrent).toHaveBeenCalledTimes(1);
    resolve(current);
    await Promise.all([first, second]);
  });

  it("updates profile and synchronizes auth full name", async () => {
    const updated = {
      ...current,
      user: { ...current.user, fullName: "Updated User" },
    };
    const updateUser = vi.fn();
    vi.mocked(useAuthStore.getState).mockReturnValue({
      user: {
        id: "user-id",
        email: "user@example.com",
        username: "creativeuser",
        fullName: "Creative User",
        status: "ACTIVE",
      },
      updateUser,
    } as never);
    vi.mocked(profileService.updateCurrent).mockResolvedValue(updated);
    await useProfileStore
      .getState()
      .updateCurrentProfile({ fullName: "Updated User" });
    expect(updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: "Updated User" }),
    );
  });

  it("caches public profiles by normalized username", async () => {
    vi.mocked(profileService.getPublicByUsername).mockResolvedValue(
      publicProfile,
    );
    await useProfileStore.getState().loadPublicProfile(" CreativeUser ");
    await useProfileStore.getState().loadPublicProfile("creativeuser");
    expect(profileService.getPublicByUsername).toHaveBeenCalledTimes(1);
  });

  it("stores an unknown-public-profile error", async () => {
    vi.mocked(profileService.getPublicByUsername).mockRejectedValue(
      new ApiError(404, "PROFILE_NOT_FOUND", "Missing"),
    );
    await expect(
      useProfileStore.getState().loadPublicProfile("missing"),
    ).rejects.toMatchObject({ code: "PROFILE_NOT_FOUND" });
    expect(useProfileStore.getState().publicProfileErrors.missing?.code).toBe(
      "PROFILE_NOT_FOUND",
    );
  });
});
