import { DEFAULT_POSTS } from "@/constants/feed";
import { STORAGE_KEYS } from "@/constants/storage";
import {
  readStorage,
  writeStorage,
} from "@/services/storage/clientStorage";
import type { Post } from "@/types/feed";

export type PostsService = {
  getAll: () => Promise<Post[]>;
  getByUserEmail: (email: string) => Promise<Post[]>;
  saveAll: (posts: Post[]) => Promise<Post[]>;
};

function normalizePost(post: Post): Post {
  return {
    ...post,
    likes: post.likes ?? 0,
    isLiked: post.isLiked ?? false,
    comments: post.comments ?? [],
    userEmail: post.userEmail ?? "",
  };
}

function readPosts(): Post[] {
  const posts = readStorage<Post[] | null>(STORAGE_KEYS.posts, null);
  return posts ? posts.map(normalizePost) : DEFAULT_POSTS;
}

export const postsService: PostsService = {
  async getAll() {
    return readPosts();
  },

  async getByUserEmail(email) {
    return readPosts().filter((post) => post.userEmail === email);
  },

  async saveAll(posts) {
    writeStorage(STORAGE_KEYS.posts, posts);
    return posts;
  },
};
