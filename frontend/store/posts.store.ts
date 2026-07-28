"use client";

import { create } from "zustand";

import { ApiError } from "@/services/api/apiClient";
import { postsService } from "@/services/api/posts.service";
import { commentsStateCoordinator } from "@/services/comments/commentsStateCoordinator";
import { postCommentCountCoordinator } from "@/services/posts/postCommentCountCoordinator";
import { postsStateCoordinator } from "@/services/posts/postsStateCoordinator";
import type {
  Post,
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
  loadGlobalPosts: (params?: PostPaginationParams) => Promise<void>;
  loadMyPosts: (params?: PostPaginationParams) => Promise<void>;
  createPost: (content: string) => Promise<Post>;
  deletePost: (postId: string) => Promise<void>;
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

  clearPosts() {
    globalRequestSequence += 1;
    myRequestSequence += 1;
    globalRequests.clear();
    myRequests.clear();
    globalRequestTokens.clear();
    myRequestTokens.clear();
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
    });
  },

  clearErrors() {
    set({
      globalError: null,
      myError: null,
      createError: null,
      deleteErrorById: {},
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
    globalStatus: shouldReloadGlobal ? "idle" : state.globalStatus,
  });

  if (shouldReloadGlobal) {
    void state.loadGlobalPosts(params).catch(() => undefined);
  }
});

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
