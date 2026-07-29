"use client";

import { create } from "zustand";

import { ApiError } from "@/services/api/apiClient";
import { postsService } from "@/services/api/posts.service";
import { commentsStateCoordinator } from "@/services/comments/commentsStateCoordinator";
import { postCommentCountCoordinator } from "@/services/posts/postCommentCountCoordinator";
import { postsStateCoordinator } from "@/services/posts/postsStateCoordinator";
import type {
  Post,
  PostLikeResponse,
  PostPage,
  PostPageMetadata,
  PostPaginationParams,
} from "@/types/feed";

export type PostsStatus = "idle" | "loading" | "loaded" | "error";

type PostsState = {
  globalPosts: Post[];
  globalPageMetadata: PostPageMetadata | null;
  globalStatus: PostsStatus;
  globalError: ApiError | null;
  myPosts: Post[];
  myPageMetadata: PostPageMetadata | null;
  myStatus: PostsStatus;
  myError: ApiError | null;
  createStatus: PostsStatus;
  createError: ApiError | null;
  deleteStatusById: Record<string, PostsStatus>;
  deleteErrorById: Record<string, ApiError | null>;
  likeStatusByPostId: Record<string, PostsStatus>;
  likeErrorByPostId: Record<string, ApiError | null>;
  loadGlobalPosts: (params?: PostPaginationParams) => Promise<void>;
  loadMyPosts: (params?: PostPaginationParams) => Promise<void>;
  createPost: (content: string) => Promise<Post>;
  syncPost: (post: Post) => void;
  deletePost: (postId: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  clearLikeError: (postId: string) => void;
  clearPosts: () => void;
  clearErrors: () => void;
};

const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 20;
const globalRequests = new Map<string, Promise<void>>();
const myRequests = new Map<string, Promise<void>>();
const globalRequestTokens = new Map<string, symbol>();
const myRequestTokens = new Map<string, symbol>();
let globalRequestSequence = 0;
let myRequestSequence = 0;
let likeOperationGeneration = 0;

type LikeSnapshot = Pick<Post, "likedByCurrentUser" | "likeCount">;

function updateLike(
  posts: Post[],
  postId: string,
  value: LikeSnapshot,
): Post[] {
  return posts.map((post) =>
    post.id === postId
      ? {
          ...post,
          likedByCurrentUser: value.likedByCurrentUser,
          likeCount: Math.max(0, value.likeCount),
        }
      : post,
  );
}

function findPost(state: PostsState, postId: string): Post | undefined {
  return (
    state.globalPosts.find(({ id }) => id === postId) ??
    state.myPosts.find(({ id }) => id === postId)
  );
}

function toApiError(error: unknown, fallback: string): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(0, "NETWORK_ERROR", fallback);
}

function metadata(page: PostPage): PostPageMetadata {
  return {
    page: page.page,
    size: page.size,
    totalElements: page.totalElements,
    totalPages: page.totalPages,
    first: page.first,
    last: page.last,
  };
}

function normalizedParams(
  params: PostPaginationParams | undefined,
  current: PostPageMetadata | null,
): Required<PostPaginationParams> {
  return {
    page: params?.page ?? current?.page ?? DEFAULT_PAGE,
    size: params?.size ?? current?.size ?? DEFAULT_SIZE,
  };
}

function incrementTotal(value: PostPageMetadata | null): PostPageMetadata | null {
  if (!value) return value;
  const totalElements = value.totalElements + 1;
  return {
    ...value,
    totalElements,
    totalPages: Math.ceil(totalElements / value.size),
    last: value.page >= Math.max(0, Math.ceil(totalElements / value.size) - 1),
  };
}

function decrementTotal(value: PostPageMetadata | null): PostPageMetadata | null {
  if (!value) return value;
  const totalElements = Math.max(0, value.totalElements - 1);
  const totalPages = Math.ceil(totalElements / value.size);
  return {
    ...value,
    totalElements,
    totalPages,
    last: value.page >= Math.max(0, totalPages - 1),
  };
}

export const usePostsStore = create<PostsState>()((set, get) => ({
  globalPosts: [],
  globalPageMetadata: null,
  globalStatus: "idle",
  globalError: null,
  myPosts: [],
  myPageMetadata: null,
  myStatus: "idle",
  myError: null,
  createStatus: "idle",
  createError: null,
  deleteStatusById: {},
  deleteErrorById: {},
  likeStatusByPostId: {},
  likeErrorByPostId: {},

  loadGlobalPosts(params) {
    const normalized = normalizedParams(params, get().globalPageMetadata);
    const key = `${normalized.page}:${normalized.size}`;
    const existing = globalRequests.get(key);
    if (existing) return existing;

    const sequence = ++globalRequestSequence;
    const token = Symbol(key);
    globalRequestTokens.set(key, token);
    const request = (async () => {
      set({ globalStatus: "loading", globalError: null });
      try {
        const page = await postsService.getGlobal(normalized);
        if (sequence === globalRequestSequence) {
          set({
            globalPosts: page.content,
            globalPageMetadata: metadata(page),
            globalStatus: "loaded",
          });
        }
      } catch (error) {
        const apiError = toApiError(error, "The public feed could not be loaded.");
        if (sequence === globalRequestSequence) {
          set({ globalStatus: "error", globalError: apiError });
        }
        throw apiError;
      } finally {
        if (globalRequestTokens.get(key) === token) {
          globalRequests.delete(key);
          globalRequestTokens.delete(key);
        }
      }
    })();
    globalRequests.set(key, request);
    return request;
  },

  loadMyPosts(params) {
    const normalized = normalizedParams(params, get().myPageMetadata);
    const key = `${normalized.page}:${normalized.size}`;
    const existing = myRequests.get(key);
    if (existing) return existing;

    const sequence = ++myRequestSequence;
    const token = Symbol(key);
    myRequestTokens.set(key, token);
    const request = (async () => {
      set({ myStatus: "loading", myError: null });
      try {
        const page = await postsService.getMine(normalized);
        if (sequence === myRequestSequence) {
          set({
            myPosts: page.content,
            myPageMetadata: metadata(page),
            myStatus: "loaded",
          });
        }
      } catch (error) {
        const apiError = toApiError(error, "Your posts could not be loaded.");
        if (sequence === myRequestSequence) {
          set({ myStatus: "error", myError: apiError });
        }
        throw apiError;
      } finally {
        if (myRequestTokens.get(key) === token) {
          myRequests.delete(key);
          myRequestTokens.delete(key);
        }
      }
    })();
    myRequests.set(key, request);
    return request;
  },

  async createPost(content) {
    set({ createStatus: "loading", createError: null });
    try {
      const post = await postsService.create({ content: content.trim() });
      set((state) => ({
        createStatus: "loaded",
        globalPosts: [post, ...state.globalPosts.filter(({ id }) => id !== post.id)],
        globalPageMetadata: incrementTotal(state.globalPageMetadata),
        myPosts:
          state.myStatus === "loaded"
            ? [post, ...state.myPosts.filter(({ id }) => id !== post.id)]
            : state.myPosts,
        myPageMetadata:
          state.myStatus === "loaded"
            ? incrementTotal(state.myPageMetadata)
            : state.myPageMetadata,
      }));
      return post;
    } catch (error) {
      const apiError = toApiError(error, "The post could not be created.");
      set({ createStatus: "error", createError: apiError });
      throw apiError;
    }
  },
  syncPost(post) {
    set((state) => ({
      globalPosts: state.globalPosts.map((item) => item.id === post.id ? post : item),
      myPosts: state.myPosts.map((item) => item.id === post.id ? post : item),
    }));
  },

  async deletePost(postId) {
    if (get().deleteStatusById[postId] === "loading") return;
    set((state) => ({
      deleteStatusById: { ...state.deleteStatusById, [postId]: "loading" },
      deleteErrorById: { ...state.deleteErrorById, [postId]: null },
    }));
    try {
      await postsService.delete(postId);
      commentsStateCoordinator.postDeleted(postId);
      set((state) => {
        const wasGlobal = state.globalPosts.some(({ id }) => id === postId);
        const wasMine = state.myPosts.some(({ id }) => id === postId);
        return {
          globalPosts: state.globalPosts.filter(({ id }) => id !== postId),
          myPosts: state.myPosts.filter(({ id }) => id !== postId),
          globalPageMetadata: wasGlobal
            ? decrementTotal(state.globalPageMetadata)
            : state.globalPageMetadata,
          myPageMetadata: wasMine
            ? decrementTotal(state.myPageMetadata)
            : state.myPageMetadata,
          deleteStatusById: {
            ...state.deleteStatusById,
            [postId]: "loaded",
          },
          likeStatusByPostId: Object.fromEntries(
            Object.entries(state.likeStatusByPostId).filter(
              ([id]) => id !== postId,
            ),
          ),
          likeErrorByPostId: Object.fromEntries(
            Object.entries(state.likeErrorByPostId).filter(
              ([id]) => id !== postId,
            ),
          ),
        };
      });
    } catch (error) {
      const apiError = toApiError(error, "The post could not be deleted.");
      set((state) => ({
        deleteStatusById: { ...state.deleteStatusById, [postId]: "error" },
        deleteErrorById: { ...state.deleteErrorById, [postId]: apiError },
      }));
      throw apiError;
    }
  },

  async likePost(postId) {
    await setLikeState(postId, true, set, get);
  },

  async unlikePost(postId) {
    await setLikeState(postId, false, set, get);
  },

  async toggleLike(postId) {
    const current = findPost(get(), postId);
    if (!current || get().likeStatusByPostId[postId] === "loading") return;
    await setLikeState(postId, !current.likedByCurrentUser, set, get);
  },

  clearLikeError(postId) {
    set((state) => ({
      likeErrorByPostId: { ...state.likeErrorByPostId, [postId]: null },
    }));
  },

  clearPosts() {
    globalRequestSequence += 1;
    myRequestSequence += 1;
    globalRequests.clear();
    myRequests.clear();
    globalRequestTokens.clear();
    myRequestTokens.clear();
    likeOperationGeneration += 1;
    set({
      globalPosts: [],
      globalPageMetadata: null,
      globalStatus: "idle",
      globalError: null,
      myPosts: [],
      myPageMetadata: null,
      myStatus: "idle",
      myError: null,
      createStatus: "idle",
      createError: null,
      deleteStatusById: {},
      deleteErrorById: {},
      likeStatusByPostId: {},
      likeErrorByPostId: {},
    });
  },

  clearErrors() {
    set({
      globalError: null,
      myError: null,
      createError: null,
      deleteErrorById: {},
      likeErrorByPostId: {},
    });
  },
}));

postsStateCoordinator.configure(() => {
  const state = usePostsStore.getState();
  const shouldReloadGlobal =
    state.globalStatus === "loaded" || state.globalStatus === "error";
  const params = state.globalPageMetadata
    ? { page: state.globalPageMetadata.page, size: state.globalPageMetadata.size }
    : undefined;

  myRequestSequence += 1;
  globalRequestSequence += 1;
  likeOperationGeneration += 1;
    globalRequests.clear();
    globalRequestTokens.clear();
  usePostsStore.setState({
    myPosts: [],
    myPageMetadata: null,
    myStatus: "idle",
    myError: null,
    createError: null,
    deleteStatusById: {},
    deleteErrorById: {},
    likeStatusByPostId: {},
    likeErrorByPostId: {},
    globalPosts: state.globalPosts.map((post) => ({
      ...post,
      likedByCurrentUser: false,
    })),
    globalStatus: shouldReloadGlobal ? "idle" : state.globalStatus,
  });

  if (shouldReloadGlobal) {
    void state.loadGlobalPosts(params).catch(() => undefined);
  }
});

async function setLikeState(
  postId: string,
  liked: boolean,
  set: (
    partial:
      | Partial<PostsState>
      | ((state: PostsState) => Partial<PostsState>),
  ) => void,
  get: () => PostsState,
): Promise<void> {
  const state = get();
  if (state.likeStatusByPostId[postId] === "loading") return;
  const current = findPost(state, postId);
  if (!current) return;

  const operationGeneration = likeOperationGeneration;
  const globalPrevious = state.globalPosts.find(({ id }) => id === postId);
  const minePrevious = state.myPosts.find(({ id }) => id === postId);
  const optimistic = {
    likedByCurrentUser: liked,
    likeCount: Math.max(
      0,
      current.likeCount +
        (liked === current.likedByCurrentUser ? 0 : liked ? 1 : -1),
    ),
  };

  set((latest) => ({
    globalPosts: updateLike(latest.globalPosts, postId, optimistic),
    myPosts: updateLike(latest.myPosts, postId, optimistic),
    likeStatusByPostId: {
      ...latest.likeStatusByPostId,
      [postId]: "loading",
    },
    likeErrorByPostId: { ...latest.likeErrorByPostId, [postId]: null },
  }));

  try {
    const response: PostLikeResponse = liked
      ? await postsService.like(postId)
      : await postsService.unlike(postId);
    if (
      operationGeneration !== likeOperationGeneration ||
      !findPost(get(), postId)
    ) {
      return;
    }
    set((latest) => ({
      globalPosts: updateLike(latest.globalPosts, postId, response),
      myPosts: updateLike(latest.myPosts, postId, response),
      likeStatusByPostId: {
        ...latest.likeStatusByPostId,
        [postId]: "loaded",
      },
    }));
  } catch (error) {
    const apiError = toApiError(error, "The like could not be updated.");
    if (
      operationGeneration === likeOperationGeneration &&
      findPost(get(), postId)
    ) {
      set((latest) => ({
        globalPosts: globalPrevious
          ? updateLike(latest.globalPosts, postId, globalPrevious)
          : latest.globalPosts,
        myPosts: minePrevious
          ? updateLike(latest.myPosts, postId, minePrevious)
          : latest.myPosts,
        likeStatusByPostId: {
          ...latest.likeStatusByPostId,
          [postId]: "error",
        },
        likeErrorByPostId: {
          ...latest.likeErrorByPostId,
          [postId]: apiError,
        },
      }));
    }
    throw apiError;
  }
}

postCommentCountCoordinator.configure((postId, delta) => {
  const update = (posts: Post[]) =>
    posts.map((post) =>
      post.id === postId
        ? {
            ...post,
            commentCount: Math.max(0, post.commentCount + delta),
          }
        : post,
    );
  usePostsStore.setState((state) => ({
    globalPosts: update(state.globalPosts),
    myPosts: update(state.myPosts),
  }));
});
