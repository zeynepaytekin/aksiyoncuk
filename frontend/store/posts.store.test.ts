import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/services/api/apiClient";
import { postsService } from "@/services/api/posts.service";
import { postsStateCoordinator } from "@/services/posts/postsStateCoordinator";
import { usePostsStore } from "@/store/posts.store";
import type { Post, PostPage } from "@/types/feed";

vi.mock("@/services/api/posts.service", () => ({
  postsService: {
    getGlobal: vi.fn(),
    getMine: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    like: vi.fn(),
    unlike: vi.fn(),
  },
}));

const post: Post = {
  id: "post-id",
  content: "Backend post",
  createdAt: "2030-01-01T00:00:00Z",
  updatedAt: "2030-01-01T00:00:00Z",
  author: {
    id: "user-id",
    username: "creativeuser",
    fullName: "Creative User",
    professionalTitle: "Director",
  },
  ownedByCurrentUser: true,
  commentCount: 0,
  likeCount: 0,
  likedByCurrentUser: false,
};

function page(content: Post[] = [post]): PostPage {
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

describe("posts store", () => {
  beforeEach(() => {
    vi.mocked(postsService.getGlobal).mockReset();
    vi.mocked(postsService.getMine).mockReset();
    vi.mocked(postsService.create).mockReset();
    vi.mocked(postsService.delete).mockReset();
    vi.mocked(postsService.like).mockReset();
    vi.mocked(postsService.unlike).mockReset();
    usePostsStore.getState().clearPosts();
  });

  it("loads the global feed and metadata", async () => {
    vi.mocked(postsService.getGlobal).mockResolvedValue(page());
    await usePostsStore.getState().loadGlobalPosts();
    expect(usePostsStore.getState().globalPosts).toEqual([post]);
    expect(usePostsStore.getState().globalPageMetadata?.totalElements).toBe(1);
  });

  it("records a global-feed failure", async () => {
    vi.mocked(postsService.getGlobal).mockRejectedValue(
      new ApiError(500, "FAILED", "Failed"),
    );
    await expect(
      usePostsStore.getState().loadGlobalPosts(),
    ).rejects.toMatchObject({ code: "FAILED" });
    expect(usePostsStore.getState().globalStatus).toBe("error");
  });

  it("deduplicates identical concurrent loads", async () => {
    let resolve!: (value: PostPage) => void;
    vi.mocked(postsService.getGlobal).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const first = usePostsStore.getState().loadGlobalPosts();
    const second = usePostsStore.getState().loadGlobalPosts();
    expect(postsService.getGlobal).toHaveBeenCalledTimes(1);
    resolve(page());
    await Promise.all([first, second]);
  });

  it("loads current-user posts", async () => {
    vi.mocked(postsService.getMine).mockResolvedValue(page());
    await usePostsStore.getState().loadMyPosts();
    expect(usePostsStore.getState().myPosts).toEqual([post]);
  });

  it("inserts a created post into loaded collections and metadata", async () => {
    usePostsStore.setState({
      globalStatus: "loaded",
      globalPosts: [],
      globalPageMetadata: { ...page([]), content: undefined } as never,
      myStatus: "loaded",
      myPosts: [],
      myPageMetadata: { ...page([]), content: undefined } as never,
    });
    vi.mocked(postsService.create).mockResolvedValue(post);
    await usePostsStore.getState().createPost("  Backend post  ");
    expect(postsService.create).toHaveBeenCalledWith({ content: "Backend post" });
    expect(usePostsStore.getState().globalPosts[0]).toEqual(post);
    expect(usePostsStore.getState().myPosts[0]).toEqual(post);
    expect(usePostsStore.getState().globalPageMetadata?.totalElements).toBe(1);
  });

  it("keeps collections unchanged when creation fails", async () => {
    vi.mocked(postsService.create).mockRejectedValue(
      new ApiError(400, "INVALID_POST_CONTENT", "Invalid"),
    );
    await expect(
      usePostsStore.getState().createPost("draft"),
    ).rejects.toMatchObject({ code: "INVALID_POST_CONTENT" });
    expect(usePostsStore.getState().globalPosts).toEqual([]);
  });

  it("removes a deleted post from global and private collections", async () => {
    usePostsStore.setState({
      globalPosts: [post],
      myPosts: [post],
      globalPageMetadata: {
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
      },
      myPageMetadata: {
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
      },
    });
    vi.mocked(postsService.delete).mockResolvedValue();
    await usePostsStore.getState().deletePost(post.id);
    expect(usePostsStore.getState().globalPosts).toEqual([]);
    expect(usePostsStore.getState().myPosts).toEqual([]);
    expect(usePostsStore.getState().myPageMetadata?.totalElements).toBe(0);
  });

  it("clears private posts and reloads ownership after auth changes", async () => {
    usePostsStore.setState({
      globalStatus: "loaded",
      globalPosts: [post],
      globalPageMetadata: {
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
      },
      myStatus: "loaded",
      myPosts: [post],
    });
    vi.mocked(postsService.getGlobal).mockResolvedValue(
      page([{ ...post, ownedByCurrentUser: false }]),
    );
    postsStateCoordinator.authenticationChanged(false);
    await vi.waitFor(() =>
      expect(usePostsStore.getState().globalPosts[0].ownedByCurrentUser).toBe(
        false,
      ),
    );
    expect(usePostsStore.getState().myPosts).toEqual([]);
    expect(usePostsStore.getState().myStatus).toBe("idle");
  });

  it("optimistically likes both collections and settles from the backend", async () => {
    usePostsStore.setState({ globalPosts: [post], myPosts: [post] });
    let resolve!: (value: {
      postId: string;
      likedByCurrentUser: boolean;
      likeCount: number;
    }) => void;
    vi.mocked(postsService.like).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );

    const request = usePostsStore.getState().toggleLike(post.id);
    expect(usePostsStore.getState().globalPosts[0]).toMatchObject({
      likedByCurrentUser: true,
      likeCount: 1,
    });
    expect(usePostsStore.getState().myPosts[0]).toMatchObject({
      likedByCurrentUser: true,
      likeCount: 1,
    });

    resolve({ postId: post.id, likedByCurrentUser: true, likeCount: 7 });
    await request;
    expect(usePostsStore.getState().globalPosts[0].likeCount).toBe(7);
    expect(usePostsStore.getState().myPosts[0].likeCount).toBe(7);
  });

  it("optimistically unlikes without allowing a negative count", async () => {
    const liked = { ...post, likedByCurrentUser: true, likeCount: 0 };
    usePostsStore.setState({ globalPosts: [liked], myPosts: [liked] });
    vi.mocked(postsService.unlike).mockResolvedValue({
      postId: post.id,
      likedByCurrentUser: false,
      likeCount: 0,
    });
    await usePostsStore.getState().toggleLike(post.id);
    expect(usePostsStore.getState().globalPosts[0].likeCount).toBe(0);
    expect(usePostsStore.getState().globalPosts[0].likedByCurrentUser).toBe(
      false,
    );
  });

  it("rolls back the exact prior like values after failure", async () => {
    const global = { ...post, likeCount: 4, likedByCurrentUser: false };
    const mine = { ...post, likeCount: 3, likedByCurrentUser: false };
    usePostsStore.setState({ globalPosts: [global], myPosts: [mine] });
    vi.mocked(postsService.like).mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "Offline"),
    );
    await expect(
      usePostsStore.getState().toggleLike(post.id),
    ).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    expect(usePostsStore.getState().globalPosts[0].likeCount).toBe(4);
    expect(usePostsStore.getState().myPosts[0].likeCount).toBe(3);
    expect(usePostsStore.getState().likeErrorByPostId[post.id]?.code).toBe(
      "NETWORK_ERROR",
    );
  });

  it("prevents duplicate pending like requests", async () => {
    usePostsStore.setState({ globalPosts: [post] });
    let resolve!: (value: {
      postId: string;
      likedByCurrentUser: boolean;
      likeCount: number;
    }) => void;
    vi.mocked(postsService.like).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const first = usePostsStore.getState().toggleLike(post.id);
    await usePostsStore.getState().toggleLike(post.id);
    expect(postsService.like).toHaveBeenCalledTimes(1);
    resolve({ postId: post.id, likedByCurrentUser: true, likeCount: 1 });
    await first;
  });

  it("clears like state when a post is deleted", async () => {
    usePostsStore.setState({
      globalPosts: [post],
      likeStatusByPostId: { [post.id]: "error" },
      likeErrorByPostId: {
        [post.id]: new ApiError(500, "FAILED", "Failed"),
      },
    });
    vi.mocked(postsService.delete).mockResolvedValue();
    await usePostsStore.getState().deletePost(post.id);
    expect(usePostsStore.getState().likeStatusByPostId[post.id]).toBeUndefined();
    expect(usePostsStore.getState().likeErrorByPostId[post.id]).toBeUndefined();
  });

  it("normalizes ownership and clears private like state on logout", async () => {
    usePostsStore.setState({
      globalStatus: "loaded",
      globalPosts: [{ ...post, likedByCurrentUser: true, likeCount: 2 }],
      likeStatusByPostId: { [post.id]: "loading" },
      likeErrorByPostId: {
        [post.id]: new ApiError(500, "FAILED", "Failed"),
      },
    });
    vi.mocked(postsService.getGlobal).mockResolvedValue(
      page([{ ...post, likedByCurrentUser: false, likeCount: 2 }]),
    );
    postsStateCoordinator.authenticationChanged(false);
    expect(usePostsStore.getState().globalPosts[0].likedByCurrentUser).toBe(
      false,
    );
    expect(usePostsStore.getState().likeStatusByPostId).toEqual({});
    expect(usePostsStore.getState().likeErrorByPostId).toEqual({});
    await vi.waitFor(() =>
      expect(postsService.getGlobal).toHaveBeenCalledTimes(1),
    );
  });
});
