"use client";

import { create } from "zustand";

import { ApiError } from "@/services/api/apiClient";
import { commentsService } from "@/services/api/comments.service";
import { commentsStateCoordinator } from "@/services/comments/commentsStateCoordinator";
import { postCommentCountCoordinator } from "@/services/posts/postCommentCountCoordinator";
import type {
  CommentPage,
  CommentPageMetadata,
  CommentPaginationParams,
  PostComment,
} from "@/types/comments";

export type CommentStatus = "idle" | "loading" | "loaded" | "error";

type CommentsState = {
  commentsByPostId: Record<string, PostComment[]>;
  pageMetadataByPostId: Record<string, CommentPageMetadata | undefined>;
  statusByPostId: Record<string, CommentStatus>;
  errorByPostId: Record<string, ApiError | null>;
  createStatusByPostId: Record<string, CommentStatus>;
  createErrorByPostId: Record<string, ApiError | null>;
  deleteStatusByCommentId: Record<string, CommentStatus>;
  deleteErrorByCommentId: Record<string, ApiError | null>;
  loadComments: (
    postId: string,
    params?: CommentPaginationParams,
  ) => Promise<void>;
  createComment: (postId: string, content: string) => Promise<PostComment>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  clearPostComments: (postId: string) => void;
  clearAllComments: () => void;
  clearErrors: (postId?: string) => void;
};

const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 20;
const requests = new Map<string, Promise<void>>();
const requestTokens = new Map<string, symbol>();
const requestSequences = new Map<string, number>();

function toApiError(error: unknown, fallback: string): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(0, "NETWORK_ERROR", fallback);
}

function metadata(page: CommentPage): CommentPageMetadata {
  return {
    page: page.page,
    size: page.size,
    totalElements: page.totalElements,
    totalPages: page.totalPages,
    first: page.first,
    last: page.last,
  };
}

function adjustMetadata(
  value: CommentPageMetadata | undefined,
  delta: number,
): CommentPageMetadata | undefined {
  if (!value) return value;
  const totalElements = Math.max(0, value.totalElements + delta);
  const totalPages = Math.ceil(totalElements / value.size);
  return {
    ...value,
    totalElements,
    totalPages,
    last: value.page >= Math.max(0, totalPages - 1),
  };
}

function currentParams(
  params: CommentPaginationParams | undefined,
  value: CommentPageMetadata | undefined,
): Required<CommentPaginationParams> {
  return {
    page: params?.page ?? value?.page ?? DEFAULT_PAGE,
    size: params?.size ?? value?.size ?? DEFAULT_SIZE,
  };
}

export const useCommentsStore = create<CommentsState>()((set, get) => ({
  commentsByPostId: {},
  pageMetadataByPostId: {},
  statusByPostId: {},
  errorByPostId: {},
  createStatusByPostId: {},
  createErrorByPostId: {},
  deleteStatusByCommentId: {},
  deleteErrorByCommentId: {},

  loadComments(postId, params) {
    const normalized = currentParams(
      params,
      get().pageMetadataByPostId[postId],
    );
    const key = `${postId}:${normalized.page}:${normalized.size}`;
    const existing = requests.get(key);
    if (existing) return existing;

    const sequence = (requestSequences.get(postId) ?? 0) + 1;
    requestSequences.set(postId, sequence);
    const token = Symbol(key);
    requestTokens.set(key, token);
    const request = (async () => {
      set((state) => ({
        statusByPostId: { ...state.statusByPostId, [postId]: "loading" },
        errorByPostId: { ...state.errorByPostId, [postId]: null },
      }));
      try {
        const page = await commentsService.getByPost(postId, normalized);
        if (requestSequences.get(postId) === sequence) {
          set((state) => ({
            commentsByPostId: {
              ...state.commentsByPostId,
              [postId]: page.content,
            },
            pageMetadataByPostId: {
              ...state.pageMetadataByPostId,
              [postId]: metadata(page),
            },
            statusByPostId: { ...state.statusByPostId, [postId]: "loaded" },
          }));
        }
      } catch (error) {
        const apiError = toApiError(error, "Comments could not be loaded.");
        if (requestSequences.get(postId) === sequence) {
          set((state) => ({
            statusByPostId: { ...state.statusByPostId, [postId]: "error" },
            errorByPostId: { ...state.errorByPostId, [postId]: apiError },
          }));
        }
        throw apiError;
      } finally {
        if (requestTokens.get(key) === token) {
          requests.delete(key);
          requestTokens.delete(key);
        }
      }
    })();
    requests.set(key, request);
    return request;
  },

  async createComment(postId, content) {
    set((state) => ({
      createStatusByPostId: {
        ...state.createStatusByPostId,
        [postId]: "loading",
      },
      createErrorByPostId: { ...state.createErrorByPostId, [postId]: null },
    }));
    try {
      const comment = await commentsService.create(postId, {
        content: content.trim(),
      });
      set((state) => {
        const page = state.pageMetadataByPostId[postId];
        const current = state.commentsByPostId[postId] ?? [];
        const shouldInsert =
          state.statusByPostId[postId] === "loaded" && page?.last;
        return {
          commentsByPostId: shouldInsert
            ? {
                ...state.commentsByPostId,
                [postId]: [
                  ...current.filter(({ id }) => id !== comment.id),
                  comment,
                ],
              }
            : state.commentsByPostId,
          pageMetadataByPostId: {
            ...state.pageMetadataByPostId,
            [postId]: adjustMetadata(page, 1),
          },
          createStatusByPostId: {
            ...state.createStatusByPostId,
            [postId]: "loaded",
          },
        };
      });
      postCommentCountCoordinator.adjust(postId, 1);
      return comment;
    } catch (error) {
      const apiError = toApiError(error, "The comment could not be created.");
      set((state) => ({
        createStatusByPostId: {
          ...state.createStatusByPostId,
          [postId]: "error",
        },
        createErrorByPostId: {
          ...state.createErrorByPostId,
          [postId]: apiError,
        },
      }));
      throw apiError;
    }
  },

  async deleteComment(postId, commentId) {
    if (get().deleteStatusByCommentId[commentId] === "loading") return;
    set((state) => ({
      deleteStatusByCommentId: {
        ...state.deleteStatusByCommentId,
        [commentId]: "loading",
      },
      deleteErrorByCommentId: {
        ...state.deleteErrorByCommentId,
        [commentId]: null,
      },
    }));
    try {
      await commentsService.delete(commentId);
      set((state) => {
        const comments = state.commentsByPostId[postId] ?? [];
        const wasLoaded = comments.some(({ id }) => id === commentId);
        return {
          commentsByPostId: {
            ...state.commentsByPostId,
            [postId]: comments.filter(({ id }) => id !== commentId),
          },
          pageMetadataByPostId: {
            ...state.pageMetadataByPostId,
            [postId]: adjustMetadata(
              state.pageMetadataByPostId[postId],
              wasLoaded ? -1 : 0,
            ),
          },
          deleteStatusByCommentId: {
            ...state.deleteStatusByCommentId,
            [commentId]: "loaded",
          },
        };
      });
      postCommentCountCoordinator.adjust(postId, -1);
    } catch (error) {
      const apiError = toApiError(error, "The comment could not be deleted.");
      set((state) => ({
        deleteStatusByCommentId: {
          ...state.deleteStatusByCommentId,
          [commentId]: "error",
        },
        deleteErrorByCommentId: {
          ...state.deleteErrorByCommentId,
          [commentId]: apiError,
        },
      }));
      throw apiError;
    }
  },

  clearPostComments(postId) {
    requestSequences.set(postId, (requestSequences.get(postId) ?? 0) + 1);
    set((state) => {
      const comments = state.commentsByPostId[postId] ?? [];
      const commentIds = new Set(comments.map(({ id }) => id));
      return {
        commentsByPostId: { ...state.commentsByPostId, [postId]: [] },
        pageMetadataByPostId: {
          ...state.pageMetadataByPostId,
          [postId]: undefined,
        },
        statusByPostId: { ...state.statusByPostId, [postId]: "idle" },
        errorByPostId: { ...state.errorByPostId, [postId]: null },
        createStatusByPostId: {
          ...state.createStatusByPostId,
          [postId]: "idle",
        },
        createErrorByPostId: {
          ...state.createErrorByPostId,
          [postId]: null,
        },
        deleteStatusByCommentId: Object.fromEntries(
          Object.entries(state.deleteStatusByCommentId).filter(
            ([id]) => !commentIds.has(id),
          ),
        ),
        deleteErrorByCommentId: Object.fromEntries(
          Object.entries(state.deleteErrorByCommentId).filter(
            ([id]) => !commentIds.has(id),
          ),
        ),
      };
    });
  },

  clearAllComments() {
    requests.clear();
    requestTokens.clear();
    requestSequences.clear();
    set({
      commentsByPostId: {},
      pageMetadataByPostId: {},
      statusByPostId: {},
      errorByPostId: {},
      createStatusByPostId: {},
      createErrorByPostId: {},
      deleteStatusByCommentId: {},
      deleteErrorByCommentId: {},
    });
  },

  clearErrors(postId) {
    if (!postId) {
      set({
        errorByPostId: {},
        createErrorByPostId: {},
        deleteErrorByCommentId: {},
      });
      return;
    }
    set((state) => ({
      errorByPostId: { ...state.errorByPostId, [postId]: null },
      createErrorByPostId: {
        ...state.createErrorByPostId,
        [postId]: null,
      },
      deleteErrorByCommentId: Object.fromEntries(
        Object.entries(state.deleteErrorByCommentId).filter(
          ([commentId]) =>
            !(state.commentsByPostId[postId] ?? []).some(
              ({ id }) => id === commentId,
            ),
        ),
      ),
    }));
  },
}));

commentsStateCoordinator.configure(
  () => {
    const state = useCommentsStore.getState();
    const loaded = Object.entries(state.statusByPostId)
      .filter(([, status]) => status === "loaded" || status === "error")
      .map(([postId]) => postId);

    requests.clear();
    requestTokens.clear();
    for (const postId of loaded) {
      requestSequences.set(postId, (requestSequences.get(postId) ?? 0) + 1);
    }
    useCommentsStore.setState({
      createStatusByPostId: {},
      createErrorByPostId: {},
      deleteStatusByCommentId: {},
      deleteErrorByCommentId: {},
      statusByPostId: Object.fromEntries(
        loaded.map((postId) => [postId, "idle" as const]),
      ),
    });
    for (const postId of loaded) {
      const page = state.pageMetadataByPostId[postId];
      void state
        .loadComments(postId, page ? { page: page.page, size: page.size } : undefined)
        .catch(() => undefined);
    }
  },
  (postId) => useCommentsStore.getState().clearPostComments(postId),
);
