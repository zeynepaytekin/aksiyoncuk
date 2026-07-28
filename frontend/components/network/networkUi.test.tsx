import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfileHeader from "@/components/profile/ProfileHeader";
import NetworkListPage from "@/components/network/NetworkListPage";
import NetworkPage from "@/components/network/NetworkPage";
import NetworkUserCard from "@/components/network/NetworkUserCard";
import { useAuthStore } from "@/store/auth.store";
import { useNetworkStore } from "@/store/network.store";
import type { NetworkUser } from "@/types/network";
import type { PublicProfile } from "@/types/profile";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams({ username: "target" }),
}));

const user: NetworkUser = {
  id: "target", username: "target", fullName: "Target User",
  professionalTitle: "Editor", followedByCurrentUser: false,
};
const profile: PublicProfile = {
  id: "profile", userId: "target", username: "target", fullName: "Target User",
  status: "ACTIVE", professionalTitle: "Editor", bio: null, location: null,
  websiteUrl: null, createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z", followerCount: 4,
  followingCount: 2, followedByCurrentUser: false,
};

describe("network UI", () => {
  beforeEach(() => {
    useNetworkStore.getState().clearPrivateNetwork();
    useNetworkStore.getState().clearPublicNetwork();
    useAuthStore.setState({
      user: null, isInitialized: true, isLoading: false, status: "unauthenticated",
    });
  });

  it("shows anonymous sign-in guidance on public users and profile", () => {
    render(<NetworkUserCard user={user} />);
    expect(screen.getByRole("link", { name: "Sign in to follow" })).toBeInTheDocument();
    render(<ProfileHeader profile={profile} isOwner={false} />);
    expect(screen.getAllByRole("link", { name: "Sign in to follow" })).toHaveLength(2);
  });

  it("exposes authenticated follow state with aria-pressed", async () => {
    useAuthStore.setState({
      user: { id: "viewer", email: "v@example.com", username: "viewer",
        fullName: "Viewer", status: "ACTIVE" },
      status: "authenticated",
    });
    const toggle = vi.fn().mockResolvedValue({});
    useNetworkStore.setState({ toggleFollow: toggle });
    render(<NetworkUserCard user={{ ...user, followedByCurrentUser: true }} />);
    const button = screen.getByRole("button", { name: "Following" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    await waitFor(() => expect(toggle).toHaveBeenCalledWith("target"));
  });

  it("hides follow for the current user", () => {
    useAuthStore.setState({
      user: { id: "target", email: "t@example.com", username: "target",
        fullName: "Target", status: "ACTIVE" },
      status: "authenticated",
    });
    render(<NetworkUserCard user={user} />);
    expect(screen.queryByRole("button", { name: "Follow" })).not.toBeInTheDocument();
    render(<ProfileHeader profile={profile} isOwner={false} />);
    expect(screen.getByRole("link", { name: "Edit Profile" })).toBeInTheDocument();
  });

  it("renders loaded followers and pagination metadata", () => {
    useNetworkStore.setState({
      followersByUsername: { target: [user] },
      followerStatusByUsername: { target: "loaded" },
      followerPageMetadataByUsername: {
        target: { page: 0, size: 20, totalElements: 21, totalPages: 2, first: true, last: false },
      },
    });
    render(<NetworkListPage kind="followers" />);
    expect(screen.getByText("Target User")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("renders the authenticated network summary", () => {
    useAuthStore.setState({
      user: { id: "viewer", email: "v@example.com", username: "viewer",
        fullName: "Viewer", status: "ACTIVE" },
      status: "authenticated",
    });
    useNetworkStore.setState({
      summary: { followerCount: 10, followingCount: 8, mutualCount: 3 },
      summaryStatus: "loaded",
    });
    render(<NetworkPage />);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
