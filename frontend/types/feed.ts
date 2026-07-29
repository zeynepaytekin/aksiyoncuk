export interface PostAuthor {
  id: string;
  username: string;
  fullName: string;
  professionalTitle: string | null;
}

export interface Post {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  ownedByCurrentUser: boolean;
  commentCount: number;
  likeCount: number;
  likedByCurrentUser: boolean;
  media?: MediaListItem[];
}

export interface PostLikeResponse {
  postId: string;
  likedByCurrentUser: boolean;
  likeCount: number;
}

export interface PostPage {
  content: Post[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface CreatePostRequest {
  content: string;
}

export interface PostPaginationParams {
  page?: number;
  size?: number;
}

export type PostPageMetadata = Omit<PostPage, "content">;
import type { MediaListItem } from "./media";
