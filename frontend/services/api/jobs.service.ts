import { STORAGE_KEYS } from "@/constants/storage";
import { createCollectionRepository } from "@/services/repositories/collectionRepository";
import type { Job } from "@/types/jobs";

export type JobsService = {
  getAll: () => Promise<Job[]>;
  getByUserEmail: (email: string) => Promise<Job[]>;
  create: (job: Job) => Promise<Job>;
};

const repository = createCollectionRepository<Job>(STORAGE_KEYS.jobs);

export const jobsService: JobsService = {
  async getAll() {
    return repository.getAll();
  },

  async getByUserEmail(email) {
    return repository
      .getAll()
      .filter((job) => job.userEmail === email);
  },

  async create(job) {
    repository.add(job);
    return job;
  },
};
