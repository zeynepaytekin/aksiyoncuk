"use client";

import { create } from "zustand";

import { ApiError } from "@/services/api/apiClient";
import { authService } from "@/services/api/auth.service";
import { sessionCoordinator } from "@/services/auth/sessionCoordinator";
import { sessionStorage } from "@/services/auth/sessionStorage";
import { profileStateCoordinator } from "@/services/profile/profileStateCoordinator";
import { commentsStateCoordinator } from "@/services/comments/commentsStateCoordinator";
import { postsStateCoordinator } from "@/services/posts/postsStateCoordinator";
import { worksStateCoordinator } from "@/services/works/worksStateCoordinator";
import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegistrationRequest,
} from "@/types/auth";

export type AuthenticationStatus =
  | "idle"
  | "initializing"
  | "authenticated"
  | "unauthenticated"
  | "loading"
  | "error";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  status: AuthenticationStatus;
  isInitialized: boolean;
  isLoading: boolean;
  error: ApiError | null;
  initialize: () => Promise<void>;
  register: (data: RegistrationRequest) => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => void;
  updateUser: (user: AuthUser) => void;
};

let initializationPromise: Promise<void> | null = null;

function applySession(
  response: AuthResponse,
  set: (partial: Partial<AuthState>) => void,
): void {
  sessionCoordinator.setAccessToken(response.accessToken);
  sessionStorage.write({
    refreshToken: response.refreshToken,
    refreshTokenExpiresAt: response.refreshTokenExpiresAt,
  });
  set({
    user: response.user,
    accessToken: response.accessToken,
    accessTokenExpiresAt: response.accessTokenExpiresAt,
    refreshTokenExpiresAt: response.refreshTokenExpiresAt,
    status: "authenticated",
    isInitialized: true,
    isLoading: false,
    error: null,
  });
}

const clearedState = {
  user: null,
  accessToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
  status: "unauthenticated" as const,
  isInitialized: true,
  isLoading: false,
  error: null,
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  accessToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
  status: "idle",
  isInitialized: false,
  isLoading: false,
  error: null,

  initialize() {
    if (get().isInitialized) return Promise.resolve();
    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
      set({ status: "initializing", isLoading: true, error: null });
      if (!sessionStorage.read()) {
        set(clearedState);
        return;
      }
      try {
        await get().refreshSession();
      } catch {
        get().clearSession();
      }
    })().finally(() => {
      initializationPromise = null;
    });
    return initializationPromise;
  },

  async register(data) {
    set({ status: "loading", isLoading: true, error: null });
    try {
      await authService.register(data);
      const response = await authService.login({
        identifier: data.email,
        password: data.password,
      });
      applySession(response, set);
      postsStateCoordinator.authenticationChanged(true);
      commentsStateCoordinator.authenticationChanged();
      worksStateCoordinator.authenticationChanged(true);
    } catch (error) {
      const apiError =
        error instanceof ApiError
          ? error
          : new ApiError(0, "UNKNOWN_ERROR", "Registration failed.");
      set({ status: "error", isLoading: false, error: apiError });
      throw apiError;
    }
  },

  async login(data) {
    set({ status: "loading", isLoading: true, error: null });
    try {
      applySession(await authService.login(data), set);
      postsStateCoordinator.authenticationChanged(true);
      commentsStateCoordinator.authenticationChanged();
      worksStateCoordinator.authenticationChanged(true);
    } catch (error) {
      const apiError =
        error instanceof ApiError
          ? error
          : new ApiError(0, "UNKNOWN_ERROR", "Sign in failed.");
      set({ status: "error", isLoading: false, error: apiError });
      throw apiError;
    }
  },

  async refreshSession() {
    const wasAuthenticated = get().status === "authenticated";
    const persisted = sessionStorage.read();
    if (!persisted) {
      get().clearSession();
      throw new ApiError(401, "INVALID_REFRESH_TOKEN", "No session exists.");
    }
    try {
      applySession(await authService.refresh(persisted.refreshToken), set);
      if (!wasAuthenticated) {
        postsStateCoordinator.authenticationChanged(true);
        commentsStateCoordinator.authenticationChanged();
        worksStateCoordinator.authenticationChanged(true);
      }
    } catch (error) {
      get().clearSession();
      throw error;
    }
  },

  async logout() {
    const persisted = sessionStorage.read();
    get().clearSession();
    if (!persisted) return;
    try {
      await authService.logout(persisted.refreshToken);
    } catch {
      // Local logout remains successful when the server is unavailable.
    }
  },

  clearSession() {
    sessionCoordinator.setAccessToken(null);
    sessionStorage.clear();
    profileStateCoordinator.clearPrivate();
    postsStateCoordinator.authenticationChanged(false);
    commentsStateCoordinator.authenticationChanged();
    worksStateCoordinator.authenticationChanged(false);
    set(clearedState);
  },

  updateUser(user) {
    set({ user });
  },
}));

sessionCoordinator.configure(
  async () => {
    try {
      await useAuthStore.getState().refreshSession();
      return useAuthStore.getState().accessToken;
    } catch {
      return null;
    }
  },
  () => useAuthStore.getState().clearSession(),
);
