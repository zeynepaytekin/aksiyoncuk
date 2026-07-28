import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Feed from "@/components/feed/Feed";
import PostCard from "@/components/feed/PostCard";
import ProfilePostsSection from "@/components/feed/ProfilePostsSection";
import type { AuthUser } from "@/types/auth";
import type { Post, PostPageMetadata } from "@/types/feed";

const loadGlobalPosts = vi.fn();
const loadMyPosts = vi.fn();
const createPost = vi.fn();
const deletePost = vi.fn();

const user: AuthUser = {
  id: "user-id",
  email: "user@example.com",
  username: "creativeuser",
  fullName: "Creative User",
  status: "ACTIVE",
};

const post: Post = {
  id: "post-id",
  content: "Real backend content",
  createdAt: "2030-01-01T00:00:00Z",
  updatedAt: "2030-01-01T00:00:00Z",
  author: {
    id: "user-id",
    username: "creativeuser",
    fullName: "Creative User",
    professionalTitle: "Director",
  },
  ownedByCurrentUser: true,
};

const metadata: PostPageMetadata = {
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

let authUser: AuthUser | null = null;
const postsState = {
  globalPosts: [post],
  globalPageMetadata: metadata as PostPageMetadata | null,
  globalStatus: "loaded",
  globalError: null,
  myPosts: [post],
  myPageMetadata: metadata as PostPageMetadata | null,
  myStatus: "loaded",
  myError: null,
  createStatus: "idle",
  createError: null,
  deleteStatusById: {} as Record<string, string>,
  loadGlobalPosts,
  loadMyPosts,
  createPost,
  deletePost,
};

vi.mock("@/store/auth.store", () => ({
  useAuthStore: (selector: (state: { user: AuthUser | null }) => unknown) =>
    selector({ user: authUser }),
}));

vi.mock("@/store/posts.store", () => ({
  usePostsStore: (selector: (state: typeof postsState) => unknown) =>
    selector(postsState),
}));

describe("feed UI", () => {
  beforeEach(() => {
    authUser = null;
    loadGlobalPosts.mockReset();
    loadGlobalPosts.mockResolvedValue(undefined);
    loadMyPosts.mockReset();
    loadMyPosts.mockResolvedValue(undefined);
    createPost.mockReset();
    deletePost.mockReset();
    postsState.globalPosts = [post];
    postsState.globalPageMetadata = metadata;
    postsState.globalStatus = "loaded";
    postsState.globalError = null;
    postsState.myPosts = [post];
    postsState.myPageMetadata = metadata;
    postsState.myStatus = "loaded";
    postsState.myError = null;
    postsState.createStatus = "idle";
    postsState.createError = null;
    postsState.deleteStatusById = {};
  });

  it("renders the public feed without an authenticated composer", () => {
    render(<Feed />);
    expect(screen.getByText("Real backend content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Post content")).toBeNull();
  });

  it("loads the public feed while unauthenticated", async () => {
    postsState.globalPosts = [];
    postsState.globalStatus = "idle";
    render(<Feed />);
    await waitFor(() => expect(loadGlobalPosts).toHaveBeenCalledTimes(1));
  });

  it("creates a trimmed post and only clears after success", async () => {
    authUser = user;
    createPost.mockResolvedValue(post);
    render(<Feed />);
    const composer = screen.getByLabelText("Post content");
    fireEvent.change(composer, { target: { value: "  New post  " } });
    fireEvent.click(screen.getByRole("button", { name: "Share Post" }));
    await waitFor(() =>
      expect(createPost).toHaveBeenCalledWith("New post"),
    );
    expect(composer).toHaveValue("");
  });

  it("blocks blank content and enforces the 3000-character input limit", () => {
    authUser = user;
    render(<Feed />);
    const composer = screen.getByLabelText("Post content");
    expect(composer).toHaveAttribute("maxlength", "3000");
    expect(screen.getByRole("button", { name: "Share Post" })).toBeDisabled();
  });

  it("shows a retryable loading error", () => {
    postsState.globalPosts = [];
    postsState.globalStatus = "error";
    postsState.globalError = {
      code: "NETWORK_ERROR",
      message: "Offline",
    } as never;
    render(<Feed />);
    expect(screen.getByText("The feed could not be loaded")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(loadGlobalPosts).toHaveBeenCalled();
  });

  it("renders real author data and disabled social placeholders", () => {
    render(<Feed />);
    expect(screen.getByText("Creative User")).toBeInTheDocument();
    expect(screen.getByText("@creativeuser · Director")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Like/ })).toBeDisabled();
    expect(screen.queryByText(/Likes:/)).toBeNull();
  });

  it("shows delete only for owned posts and confirms deletion", async () => {
    deletePost.mockResolvedValue(undefined);
    const { rerender } = render(<PostCard post={post} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    fireEvent.click(deleteButtons.at(-1)!);
    await waitFor(() => expect(deletePost).toHaveBeenCalledWith("post-id"));

    rerender(<PostCard post={{ ...post, ownedByCurrentUser: false }} />);
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("keeps the delete dialog open and displays failures", async () => {
    deletePost.mockRejectedValue(new Error("failed"));
    render(<PostCard post={post} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);
    expect(
      await screen.findByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
  });

  it("loads the authenticated profile feed and shows its empty state", async () => {
    postsState.myPosts = [];
    postsState.myStatus = "idle";
    const { rerender } = render(<ProfilePostsSection />);
    await waitFor(() => expect(loadMyPosts).toHaveBeenCalledTimes(1));

    postsState.myStatus = "loaded";
    rerender(<ProfilePostsSection />);
    expect(
      screen.getByText("You have not shared a post yet."),
    ).toBeInTheDocument();
  });

  it("uses backend pagination metadata", () => {
    postsState.globalPageMetadata = {
      ...metadata,
      totalElements: 40,
      totalPages: 2,
      last: false,
    };
    render(<Feed />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(loadGlobalPosts).toHaveBeenCalledWith({ page: 1, size: 20 });
  });
});
