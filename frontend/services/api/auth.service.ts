import { STORAGE_KEYS } from "@/constants/storage";
import {
  readStorage,
  removeStorage,
  writeStorage,
} from "@/services/storage/clientStorage";
import type { User } from "@/types/auth";

export type AuthService = {
  getCurrentUser: () => Promise<User | null>;
  login: (user: User) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<User>;
};

export const authService: AuthService = {
  async getCurrentUser() {
    return readStorage<User | null>(STORAGE_KEYS.user, null);
  },

  async login(user) {
    writeStorage(STORAGE_KEYS.user, user);
    return user;
  },

  async logout() {
    removeStorage(STORAGE_KEYS.user);
  },

  async updateUser(user) {
    writeStorage(STORAGE_KEYS.user, user);
    return user;
  },
};
