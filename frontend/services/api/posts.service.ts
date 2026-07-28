import { apiRequest } from "@/services/api/apiClient";
import type {
  CreatePostRequest,
  Post,
  PostLikeResponse,
  PostPage,
  PostPaginationParams,
} from "@/types/feed";

export type PostsService = typeof postsService;

function paginationQuery(params?: PostPaginationParams): string {
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

export const postsService = {
  getGlobal(params?: PostPaginationParams): Promise<PostPage> {
    return apiRequest<PostPage>(`/posts${paginationQuery(params)}`, {
      authenticated: true,
    });
  },

  getMine(params?: PostPaginationParams): Promise<PostPage> {
    return apiRequest<PostPage>(`/posts/me${paginationQuery(params)}`, {
      authenticated: true,
    });
  },

  getById(postId: string): Promise<Post> {
    return apiRequest<Post>(`/posts/${encodeURIComponent(postId)}`, {
      authenticated: true,
    });
  },

  create(request: CreatePostRequest): Promise<Post> {
    return apiRequest<Post>("/posts", {
      method: "POST",
      body: request,
      authenticated: true,
    });
  },

  delete(postId: string): Promise<void> {
    return apiRequest<void>(`/posts/${encodeURIComponent(postId)}`, {
      method: "DELETE",
      authenticated: true,
    });
  },

  like(postId: string): Promise<PostLikeResponse> {
    return apiRequest<PostLikeResponse>(
      `/posts/${encodeURIComponent(postId)}/like`,
      {
        method: "PUT",
        authenticated: true,
      },
    );
  },

  unlike(postId: string): Promise<PostLikeResponse> {
    return apiRequest<PostLikeResponse>(
      `/posts/${encodeURIComponent(postId)}/like`,
      {
        method: "DELETE",
        authenticated: true,
      },
    );
  },
};
