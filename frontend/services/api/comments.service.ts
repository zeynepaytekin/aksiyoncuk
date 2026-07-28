import { apiRequest } from "@/services/api/apiClient";
import type {
  CommentPage,
  CommentPaginationParams,
  CreateCommentRequest,
  PostComment,
} from "@/types/comments";

function paginationQuery(params?: CommentPaginationParams): string {
  const searchParams = new URLSearchParams();
  if (params?.page !== undefined) {
    searchParams.set("page", String(params.page));
  }
  if (params?.size !== undefined) {
    searchParams.set("size", String(params.size));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const commentsService = {
  getByPost(
    postId: string,
    params?: CommentPaginationParams,
  ): Promise<CommentPage> {
    return apiRequest<CommentPage>(
      `/posts/${encodeURIComponent(postId)}/comments${paginationQuery(params)}`,
      { authenticated: true },
    );
  },

  create(
    postId: string,
    request: CreateCommentRequest,
  ): Promise<PostComment> {
    return apiRequest<PostComment>(
      `/posts/${encodeURIComponent(postId)}/comments`,
      {
        method: "POST",
        authenticated: true,
        body: request,
      },
    );
  },

  delete(commentId: string): Promise<void> {
    return apiRequest<void>(`/comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE",
      authenticated: true,
    });
  },
};
