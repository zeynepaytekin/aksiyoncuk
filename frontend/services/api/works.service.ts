import { STORAGE_KEYS } from "@/constants/storage";
import { createCollectionRepository } from "@/services/repositories/collectionRepository";
import type { Work } from "@/types/works";

export type WorksService = {
  getAll: () => Promise<Work[]>;
  getByUserEmail: (email: string) => Promise<Work[]>;
  create: (work: Work) => Promise<Work>;
};

const repository = createCollectionRepository<Work>(STORAGE_KEYS.works);

export const worksService: WorksService = {
  async getAll() {
    return repository.getAll();
  },

  async getByUserEmail(email) {
    return repository
      .getAll()
      .filter((work) => work.userEmail === email);
  },

  async create(work) {
    repository.add(work);
    return work;
  },
};
