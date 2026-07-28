"use client";

import { create } from "zustand";

import { jobsService } from "@/services/api/jobs.service";
import { profileService } from "@/services/api/profile.service";
import { worksService } from "@/services/api/works.service";
import type { Job } from "@/types/jobs";
import type { Work } from "@/types/works";

type ContentState = {
  works: Work[];
  jobs: Job[];
  isProfileLoading: boolean;
  loadProfile: (email: string) => Promise<void>;
  createWork: (work: Work) => Promise<void>;
  createJob: (job: Job) => Promise<void>;
};

export const useContentStore = create<ContentState>()((set) => ({
  works: [],
  jobs: [],
  isProfileLoading: true,

  async loadProfile(email) {
    set({ isProfileLoading: true });

    try {
      const content = await profileService.getContent(email);
      set({
        works: content.works,
        jobs: content.jobs,
      });
    } finally {
      set({ isProfileLoading: false });
    }
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
