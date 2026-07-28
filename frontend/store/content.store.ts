"use client";

import { create } from "zustand";

import { jobsService } from "@/services/api/jobs.service";
import { postsService } from "@/services/api/posts.service";
import { profileService } from "@/services/api/profile.service";
import { worksService } from "@/services/api/works.service";
import type { Comment, Post } from "@/types/feed";
import type { Job } from "@/types/jobs";
import type { Work } from "@/types/works";

type ContentState = {
  posts: Post[];
  profilePosts: Post[];
  works: Work[];
  jobs: Job[];
  isPostsLoading: boolean;
  isProfileLoading: boolean;
  loadPosts: () => Promise<void>;
  loadProfile: (email: string) => Promise<void>;
  addPost: (post: Post) => Promise<void>;
  togglePostLike: (postId: number) => Promise<void>;
  addComment: (postId: number, comment: Comment) => Promise<void>;
  createWork: (work: Work) => Promise<void>;
  createJob: (job: Job) => Promise<void>;
};

async function persistPosts(posts: Post[]): Promise<void> {
  await postsService.saveAll(posts);
}

export const useContentStore = create<ContentState>()((set, get) => ({
  posts: [],
  profilePosts: [],
  works: [],
  jobs: [],
  isPostsLoading: true,
  isProfileLoading: true,

  async loadPosts() {
    set({ isPostsLoading: true });

    try {
      const posts = await postsService.getAll();
      set({ posts });
    } finally {
      set({ isPostsLoading: false });
    }
  },

  async loadProfile(email) {
    set({ isProfileLoading: true });

    try {
      const content = await profileService.getContent(email);
      set({
        profilePosts: content.posts,
        works: content.works,
        jobs: content.jobs,
      });
    } finally {
      set({ isProfileLoading: false });
    }
  },

  async addPost(post) {
    const posts = [post, ...get().posts];
    set((state) => ({
      posts,
      profilePosts:
        post.userEmail && state.profilePosts.every((item) => item.id !== post.id)
          ? [post, ...state.profilePosts]
          : state.profilePosts,
    }));
    await persistPosts(posts);
  },

  async togglePostLike(postId) {
    const updatePosts = (posts: Post[]) =>
      posts.map((post) => {
        if (post.id !== postId) return post;

        return {
          ...post,
          isLiked: !post.isLiked,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1,
        };
      });

    const posts = updatePosts(get().posts);
    set((state) => ({
      posts,
      profilePosts: updatePosts(state.profilePosts),
    }));
    await persistPosts(posts);
  },

  async addComment(postId, comment) {
    const updatePosts = (posts: Post[]) =>
      posts.map((post) =>
        post.id === postId
          ? { ...post, comments: [...post.comments, comment] }
          : post,
      );

    const posts = updatePosts(get().posts);
    set((state) => ({
      posts,
      profilePosts: updatePosts(state.profilePosts),
    }));
    await persistPosts(posts);
  },

  async createWork(work) {
    await worksService.create(work);
    set((state) => ({ works: [work, ...state.works] }));
  },

  async createJob(job) {
    await jobsService.create(job);
    set((state) => ({ jobs: [job, ...state.jobs] }));
  },
}));
