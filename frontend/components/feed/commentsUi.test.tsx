import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PostCard from "@/components/feed/PostCard";
import type { AuthUser } from "@/types/auth";
import type { CommentPageMetadata, PostComment } from "@/types/comments";
import type { Post } from "@/types/feed";

const loadComments = vi.fn();
const createComment = vi.fn();
const deleteComment = vi.fn();
const deletePost = vi.fn();
let authUser: AuthUser | null = null;

const comment: PostComment = {
  id: "comment-id",
  postId: "post-id",
  content: "Real backend comment",
  createdAt: "2030-01-01T00:00:00Z",
  updatedAt: "2030-01-01T00:00:00Z",
  author: {
    id: "user-id",
    username: "commenter",
    fullName: "Comment Author",
    professionalTitle: "Director",
  },
  ownedByCurrentUser: true,
};

const post: Post = {
  id: "post-id",
  content: "Post content",
  createdAt: "2030-01-01T00:00:00Z",
  updatedAt: "2030-01-01T00:00:00Z",
  author: {
    id: "post-author",
    username: "poster",
    fullName: "Post Author",
    professionalTitle: null,
  },
  ownedByCurrentUser: false,
  commentCount: 1,
};

const metadata: CommentPageMetadata = {
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

const commentsState = {
  commentsByPostId: { "post-id": [comment] } as Record<string, PostComment[]>,
  pageMetadataByPostId: {
    "post-id": metadata,
  } as Record<string, CommentPageMetadata | undefined>,
  statusByPostId: { "post-id": "loaded" } as Record<string, string>,
  errorByPostId: {} as Record<string, unknown>,
  createStatusByPostId: {} as Record<string, string>,
  createErrorByPostId: {} as Record<string, unknown>,
  deleteStatusByCommentId: {} as Record<string, string>,
  loadComments,
  createComment,
  deleteComment,
};

vi.mock("@/store/auth.store", () => ({
  useAuthStore: (selector: (state: { user: AuthUser | null }) => unknown) =>
    selector({ user: authUser }),
}));
vi.mock("@/store/posts.store", () => ({
  usePostsStore: (
    selector: (state: {
      deletePost: typeof deletePost;
      deleteStatusById: Record<string, string>;
    }) => unknown,
  ) => selector({ deletePost, deleteStatusById: {} }),
}));
vi.mock("@/store/comments.store", () => ({
  useCommentsStore: (selector: (state: typeof commentsState) => unknown) =>
    selector(commentsState),
}));

describe("comment UI", () => {
  beforeEach(() => {
    authUser = null;
    loadComments.mockReset();
    loadComments.mockResolvedValue(undefined);
    createComment.mockReset();
    deleteComment.mockReset();
    deletePost.mockReset();
    commentsState.commentsByPostId = { "post-id": [comment] };
    commentsState.pageMetadataByPostId = { "post-id": metadata };
    commentsState.statusByPostId = { "post-id": "loaded" };
    commentsState.errorByPostId = {};
    commentsState.createStatusByPostId = {};
    commentsState.createErrorByPostId = {};
    commentsState.deleteStatusByCommentId = {};
  });

  it("loads comments lazily and exposes expansion accessibility state", () => {
    commentsState.statusByPostId = {};
    render(<PostCard post={post} />);
    const toggle = screen.getByRole("button", { name: "Comments (1)" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls");
    expect(loadComments).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(loadComments).toHaveBeenCalledWith("post-id", {
      page: 0,
      size: 20,
    });
  });

  it("allows anonymous reading but hides the composer", () => {
    render(<PostCard post={post} />);
    fireEvent.click(screen.getByRole("button", { name: "Comments (1)" }));
    expect(screen.getByText("Real backend comment")).toBeInTheDocument();
    expect(screen.getByText("@commenter · Director")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Add a comment")).toBeNull();
  });

  it("submits a trimmed authenticated comment and clears on success", async () => {
    authUser = {
      id: "user-id",
      email: "user@example.com",
      username: "user",
      fullName: "User",
      status: "ACTIVE",
    };
    createComment.mockResolvedValue(comment);
    render(<PostCard post={post} />);
    fireEvent.click(screen.getByRole("button", { name: "Comments (1)" }));
    const composer = screen.getByLabelText("Add a comment");
    fireEvent.change(composer, { target: { value: "  New comment  " } });
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    await waitFor(() =>
      expect(createComment).toHaveBeenCalledWith("post-id", "New comment"),
    );
    expect(composer).toHaveValue("");
  });

  it("blocks blank comments and enforces the 2000-character limit", () => {
    authUser = {
      id: "user-id",
      email: "user@example.com",
      username: "user",
      fullName: "User",
      status: "ACTIVE",
    };
    render(<PostCard post={post} />);
    fireEvent.click(screen.getByRole("button", { name: "Comments (1)" }));
    expect(screen.getByLabelText("Add a comment")).toHaveAttribute(
      "maxlength",
      "2000",
    );
    expect(screen.getByRole("button", { name: "Comment" })).toBeDisabled();
  });

  it("shows loading, retryable error, and empty states", () => {
    commentsState.commentsByPostId = { "post-id": [] };
    commentsState.statusByPostId = { "post-id": "loading" };
    const { rerender } = render(<PostCard post={post} />);
    fireEvent.click(screen.getByRole("button", { name: "Comments (1)" }));
    expect(screen.getByLabelText("Loading comments")).toBeInTheDocument();

    commentsState.statusByPostId = { "post-id": "error" };
    commentsState.errorByPostId = {
      "post-id": { code: "NETWORK_ERROR", message: "Offline" },
    };
    rerender(<PostCard post={post} />);
    expect(screen.getByText("Comments could not be loaded")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(loadComments).toHaveBeenCalled();

    commentsState.statusByPostId = { "post-id": "loaded" };
    commentsState.errorByPostId = {};
    rerender(<PostCard post={post} />);
    expect(screen.getByText("No comments yet.")).toBeInTheDocument();
  });

  it("shows deletion only for owned comments and confirms it", async () => {
    deleteComment.mockResolvedValue(undefined);
    render(<PostCard post={post} />);
    fireEvent.click(screen.getByRole("button", { name: "Comments (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete comment" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Delete comment" }).at(-1)!,
    );
    await waitFor(() =>
      expect(deleteComment).toHaveBeenCalledWith("post-id", "comment-id"),
    );
  });

  it("hides deletion for non-owned comments and displays deletion failures", async () => {
    commentsState.commentsByPostId = {
      "post-id": [{ ...comment, ownedByCurrentUser: false }],
    };
    const { rerender } = render(<PostCard post={post} />);
    fireEvent.click(screen.getByRole("button", { name: "Comments (1)" }));
    expect(screen.queryByRole("button", { name: "Delete comment" })).toBeNull();

    commentsState.commentsByPostId = { "post-id": [comment] };
    deleteComment.mockRejectedValue(new Error("failed"));
    rerender(<PostCard post={post} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete comment" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Delete comment" }).at(-1)!,
    );
    expect(
      await screen.findByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
  });

  it("uses per-post pagination controls", () => {
    commentsState.pageMetadataByPostId = {
      "post-id": {
        ...metadata,
        totalElements: 40,
        totalPages: 2,
        last: false,
      },
    };
    render(<PostCard post={post} />);
    fireEvent.click(screen.getByRole("button", { name: "Comments (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Next comments" }));
    expect(loadComments).toHaveBeenCalledWith("post-id", {
      page: 1,
      size: 20,
    });
  });
});
