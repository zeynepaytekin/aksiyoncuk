import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/services/api/apiClient";
import { commentsService } from "@/services/api/comments.service";
import { commentsStateCoordinator } from "@/services/comments/commentsStateCoordinator";
import { useCommentsStore } from "@/store/comments.store";
import { usePostsStore } from "@/store/posts.store";
import type { CommentPage, PostComment } from "@/types/comments";
import type { Post } from "@/types/feed";

vi.mock("@/services/api/comments.service", () => ({
  commentsService: {
    getByPost: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

const comment: PostComment = {
  id: "comment-id",
  postId: "post-id",
  content: "A comment",
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

const post: Post = {
  id: "post-id",
  content: "Post",
  createdAt: "2030-01-01T00:00:00Z",
  updatedAt: "2030-01-01T00:00:00Z",
  author: comment.author,
  ownedByCurrentUser: true,
  commentCount: 0,
};

function page(content: PostComment[] = [comment]): CommentPage {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    first: true,
    last: true,
  };
}

describe("comments store", () => {
  beforeEach(() => {
    vi.mocked(commentsService.getByPost).mockReset();
    vi.mocked(commentsService.create).mockReset();
    vi.mocked(commentsService.delete).mockReset();
    useCommentsStore.getState().clearAllComments();
    usePostsStore.setState({ globalPosts: [post], myPosts: [post] });
  });

  it("loads comments and pagination metadata", async () => {
    vi.mocked(commentsService.getByPost).mockResolvedValue(page());
    await useCommentsStore.getState().loadComments("post-id");
    expect(useCommentsStore.getState().commentsByPostId["post-id"]).toEqual([
      comment,
    ]);
    expect(
      useCommentsStore.getState().pageMetadataByPostId["post-id"]?.totalElements,
    ).toBe(1);
  });

  it("records a load failure", async () => {
    vi.mocked(commentsService.getByPost).mockRejectedValue(
      new ApiError(500, "FAILED", "Failed"),
    );
    await expect(
      useCommentsStore.getState().loadComments("post-id"),
    ).rejects.toMatchObject({ code: "FAILED" });
    expect(useCommentsStore.getState().statusByPostId["post-id"]).toBe("error");
  });

  it("deduplicates concurrent requests for the same post and page", async () => {
    let resolve!: (value: CommentPage) => void;
    vi.mocked(commentsService.getByPost).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const first = useCommentsStore.getState().loadComments("post-id");
    const second = useCommentsStore.getState().loadComments("post-id");
    expect(commentsService.getByPost).toHaveBeenCalledTimes(1);
    resolve(page());
    await Promise.all([first, second]);
  });

  it("creates, inserts, and increments both loaded post counts", async () => {
    vi.mocked(commentsService.getByPost).mockResolvedValue(page([]));
    await useCommentsStore.getState().loadComments("post-id");
    vi.mocked(commentsService.create).mockResolvedValue(comment);
    await useCommentsStore.getState().createComment("post-id", " Comment ");
    expect(commentsService.create).toHaveBeenCalledWith("post-id", {
      content: "Comment",
    });
    expect(useCommentsStore.getState().commentsByPostId["post-id"]).toEqual([
      comment,
    ]);
    expect(usePostsStore.getState().globalPosts[0].commentCount).toBe(1);
    expect(usePostsStore.getState().myPosts[0].commentCount).toBe(1);
  });

  it("deletes, removes, and decrements both loaded post counts", async () => {
    vi.mocked(commentsService.getByPost).mockResolvedValue(page());
    await useCommentsStore.getState().loadComments("post-id");
    usePostsStore.setState({
      globalPosts: [{ ...post, commentCount: 1 }],
      myPosts: [{ ...post, commentCount: 1 }],
    });
    vi.mocked(commentsService.delete).mockResolvedValue();
    await useCommentsStore
      .getState()
      .deleteComment("post-id", "comment-id");
    expect(useCommentsStore.getState().commentsByPostId["post-id"]).toEqual([]);
    expect(usePostsStore.getState().globalPosts[0].commentCount).toBe(0);
    expect(usePostsStore.getState().myPosts[0].commentCount).toBe(0);
  });

  it("clears comments when their post is deleted", async () => {
    vi.mocked(commentsService.getByPost).mockResolvedValue(page());
    await useCommentsStore.getState().loadComments("post-id");
    commentsStateCoordinator.postDeleted("post-id");
    expect(useCommentsStore.getState().commentsByPostId["post-id"]).toEqual([]);
    expect(useCommentsStore.getState().statusByPostId["post-id"]).toBe("idle");
  });

  it("clears pending private state and reloads ownership on auth change", async () => {
    vi.mocked(commentsService.getByPost).mockResolvedValue(page());
    await useCommentsStore.getState().loadComments("post-id");
    useCommentsStore.setState({
      createStatusByPostId: { "post-id": "error" },
      deleteStatusByCommentId: { "comment-id": "error" },
    });
    vi.mocked(commentsService.getByPost).mockResolvedValue(
      page([{ ...comment, ownedByCurrentUser: false }]),
    );
    commentsStateCoordinator.authenticationChanged();
    await vi.waitFor(() =>
      expect(
        useCommentsStore.getState().commentsByPostId["post-id"][0]
          .ownedByCurrentUser,
      ).toBe(false),
    );
    expect(useCommentsStore.getState().createStatusByPostId).toEqual({});
    expect(useCommentsStore.getState().deleteStatusByCommentId).toEqual({});
  });
});
