export interface CommentAuthor {
  id: string;
  username: string;
  fullName: string;
  professionalTitle: string | null;
}

export interface PostComment {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor;
  ownedByCurrentUser: boolean;
}

export interface CommentPage {
  content: PostComment[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface CreateCommentRequest {
  content: string;
}

export interface CommentPaginationParams {
  page?: number;
  size?: number;
}

export type CommentPageMetadata = Omit<CommentPage, "content">;
