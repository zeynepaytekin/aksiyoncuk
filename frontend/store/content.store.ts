"use client";

import { create } from "zustand";

import { jobsService } from "@/services/api/jobs.service";
import type { Job } from "@/types/jobs";

type ContentState = {
  jobs: Job[];
  isProfileLoading: boolean;
  loadProfile: (email: string) => Promise<void>;
  createJob: (job: Job) => Promise<void>;
};

export const useContentStore = create<ContentState>()((set) => ({
  jobs: [],
  isProfileLoading: true,

  async loadProfile(email) {
    set({ isProfileLoading: true });

    try {
      set({ jobs: await jobsService.getByUserEmail(email) });
    } finally {
      set({ isProfileLoading: false });
    }
  },

  async createJob(job) {
    await jobsService.create(job);
    set((state) => ({ jobs: [job, ...state.jobs] }));
  },
}));
