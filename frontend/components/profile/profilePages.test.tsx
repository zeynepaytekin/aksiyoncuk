import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProfilePage from "@/app/profile/page";
import PublicProfilePage from "@/app/users/page";
import EditProfilePage from "@/components/profile/EditProfilePage";
import ProfileHeader from "@/components/profile/ProfileHeader";
import type { CurrentProfile, PublicProfile } from "@/types/profile";

const push = vi.fn();
let queryUsername = "creativeuser";
const updateCurrentProfile = vi.fn();
const loadCurrentProfile = vi.fn();
const loadPublicProfile = vi.fn();

const current: CurrentProfile = {
  id: "profile-id",
  user: {
    id: "user-id",
    email: "private@example.com",
    username: "creativeuser",
    fullName: "Creative User",
    status: "ACTIVE",
    createdAt: "2030-01-01T00:00:00Z",
  },
  professionalTitle: "Director",
  bio: "Backend biography",
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
  bio: "Public biography",
  location: null,
  websiteUrl: null,
  createdAt: "2030-01-01T00:00:00Z",
  updatedAt: "2030-01-01T00:00:00Z",
};

const profileState = {
  currentProfile: current as CurrentProfile | null,
  currentProfileStatus: "loaded",
  currentProfileError: null,
  publicProfiles: { creativeuser: publicProfile } as Record<
    string,
    PublicProfile
  >,
  publicProfileStatuses: { creativeuser: "loaded" } as Record<string, string>,
  publicProfileErrors: {} as Record<string, unknown>,
  loadCurrentProfile,
  updateCurrentProfile,
  loadPublicProfile,
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams({ username: queryUsername }),
}));
vi.mock("@/hooks/useRequireAuth", () => ({
  useRequireAuth: () => ({
    isLoading: false,
    user: current.user,
  }),
}));
vi.mock("@/store/profile.store", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/store/profile.store")>();
  return {
    ...original,
    useProfileStore: (selector: (state: typeof profileState) => unknown) =>
      selector(profileState),
  };
});
vi.mock("@/components/profile/ProfileContent", () => ({
  default: () => <div>Mock content fixtures</div>,
}));
vi.mock("@/components/works/PublicWorksSection", () => ({
  default: () => <div>Public works</div>,
}));

describe("profile UI", () => {
  beforeEach(() => {
    push.mockReset();
    updateCurrentProfile.mockReset();
    loadCurrentProfile.mockReset();
    loadPublicProfile.mockReset();
    profileState.currentProfile = current;
    profileState.currentProfileStatus = "loaded";
    profileState.currentProfileError = null;
    profileState.publicProfiles = { creativeuser: publicProfile };
    profileState.publicProfileStatuses = { creativeuser: "loaded" };
    profileState.publicProfileErrors = {};
    queryUsername = "creativeuser";
  });

  it("shows the current profile loading state", () => {
    profileState.currentProfile = null;
    profileState.currentProfileStatus = "loading";
    render(<ProfilePage />);
    expect(screen.getByLabelText("Loading profile")).toBeInTheDocument();
  });

  it("renders backend profile data without owner Follow or Message controls", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Creative User")).toBeInTheDocument();
    expect(screen.getByText("Backend biography")).toBeInTheDocument();
    expect(screen.getByText("Bucharest")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Follow" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Message" })).toBeNull();
  });

  it("initializes the editor and sends only changed fields", async () => {
    updateCurrentProfile.mockResolvedValue(current);
    render(<EditProfilePage />);
    const title = await screen.findByLabelText("Professional Title");
    expect(title).toHaveValue("Director");
    fireEvent.change(title, { target: { value: "Producer" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() =>
      expect(updateCurrentProfile).toHaveBeenCalledWith({
        professionalTitle: "Producer",
      }),
    );
  });

  it("sends null when a nullable field is cleared", async () => {
    updateCurrentProfile.mockResolvedValue(current);
    render(<EditProfilePage />);
    const bio = await screen.findByLabelText("About");
    fireEvent.change(bio, { target: { value: "   " } });
    fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() =>
      expect(updateCurrentProfile).toHaveBeenCalledWith({ bio: null }),
    );
  });

  it("blocks an invalid website URL on the client", async () => {
    render(<EditProfilePage />);
    const website = await screen.findByLabelText("Website");
    fireEvent.change(website, { target: { value: "ftp://example.com" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }));
    expect(
      await screen.findByText(
        "Website must be an absolute HTTP or HTTPS URL.",
      ),
    ).toBeInTheDocument();
    expect(updateCurrentProfile).not.toHaveBeenCalled();
  });

  it("displays a backend validation error", async () => {
    const { ApiError } = await import("@/services/api/apiClient");
    updateCurrentProfile.mockRejectedValue(
      new ApiError(400, "INVALID_PROFILE_UPDATE", "Full name is invalid"),
    );
    render(<EditProfilePage />);
    const fullName = await screen.findByLabelText("Full Name");
    fireEvent.change(fullName, { target: { value: "Updated User" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }));
    expect(
      await screen.findByText("Full name is invalid"),
    ).toBeInTheDocument();
  });

  it("public profile shows no email or Edit Profile action", () => {
    render(<PublicProfilePage />);
    expect(screen.getByText("Public biography")).toBeInTheDocument();
    expect(screen.queryByText("private@example.com")).toBeNull();
    expect(screen.queryByRole("link", { name: "Edit Profile" })).toBeNull();
  });

  it("shows a public profile not-found state", () => {
    profileState.publicProfiles = {};
    profileState.publicProfileStatuses = { creativeuser: "error" };
    profileState.publicProfileErrors = {
      creativeuser: { code: "PROFILE_NOT_FOUND", message: "Missing" },
    };
    render(<PublicProfilePage />);
    expect(screen.getByText("Profile not found")).toBeInTheDocument();
  });

  it("public header exposes only disabled placeholder actions", () => {
    render(<ProfileHeader profile={publicProfile} isOwner={false} />);
    expect(screen.getByRole("button", { name: "Follow" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Message" })).toBeDisabled();
  });
});
