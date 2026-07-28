export type Comment = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
};

export type Post = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
  likes: number;
  isLiked: boolean;
  comments: Comment[];
  userEmail: string;
};
