"use client";

import { create } from "zustand";

import { authService } from "@/services/api/auth.service";
import { profileService } from "@/services/api/profile.service";
import type { User } from "@/types/auth";

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,

  async initialize() {
    if (get().isInitialized) return;

    set({ isInitialized: true });

    try {
      const user = await authService.getCurrentUser();
      set({ user });
    } finally {
      set({ isLoading: false });
    }
  },

  async login(userData) {
    const user = await authService.login(userData);
    set({ user });
  },

  async logout() {
    await authService.logout();
    set({ user: null });
  },

  async updateUser(userData) {
    const user = await profileService.update(userData);
    set({ user });
  },
}));
