"use client";

import { create } from "zustand";

import { ApiError } from "@/services/api/apiClient";
import { profileService } from "@/services/api/profile.service";
import { profileStateCoordinator } from "@/services/profile/profileStateCoordinator";
import { useAuthStore } from "@/store/auth.store";
import type {
  CurrentProfile,
  PublicProfile,
  UpdateProfileRequest,
} from "@/types/profile";

export type ProfileStatus = "idle" | "loading" | "loaded" | "error";

type ProfileState = {
  currentProfile: CurrentProfile | null;
  currentProfileStatus: ProfileStatus;
  currentProfileError: ApiError | null;
  publicProfiles: Record<string, PublicProfile>;
  publicProfileStatuses: Record<string, ProfileStatus>;
  publicProfileErrors: Record<string, ApiError | null>;
  loadCurrentProfile: () => Promise<CurrentProfile>;
  updateCurrentProfile: (
    request: UpdateProfileRequest,
  ) => Promise<CurrentProfile>;
  loadPublicProfile: (username: string) => Promise<PublicProfile>;
  clearCurrentProfile: () => void;
  clearAllProfileState: () => void;
};

let currentRequest: Promise<CurrentProfile> | null = null;
let currentGeneration = 0;
const publicRequests = new Map<string, Promise<PublicProfile>>();

function asApiError(error: unknown, message: string): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(0, "UNKNOWN_ERROR", message);
}

export function normalizeProfileUsername(username: string): string {
  return username.trim().toLowerCase();
}

export const useProfileStore = create<ProfileState>()((set, get) => ({
  currentProfile: null,
  currentProfileStatus: "idle",
  currentProfileError: null,
  publicProfiles: {},
  publicProfileStatuses: {},
  publicProfileErrors: {},

  loadCurrentProfile() {
    if (get().currentProfileStatus === "loaded" && get().currentProfile) {
      return Promise.resolve(get().currentProfile!);
    }
    if (currentRequest) return currentRequest;

    const generation = currentGeneration;
    set({ currentProfileStatus: "loading", currentProfileError: null });
    currentRequest = profileService
      .getCurrent()
      .then((profile) => {
        if (generation === currentGeneration) {
          set({
            currentProfile: profile,
            currentProfileStatus: "loaded",
            currentProfileError: null,
          });
        }
        return profile;
      })
      .catch((error: unknown) => {
        const apiError = asApiError(error, "Unable to load your profile.");
        if (generation === currentGeneration) {
          set({ currentProfileStatus: "error", currentProfileError: apiError });
        }
        throw apiError;
      })
      .finally(() => {
        currentRequest = null;
      });
    return currentRequest;
  },

  async updateCurrentProfile(request) {
    const generation = currentGeneration;
    set({ currentProfileStatus: "loading", currentProfileError: null });
    try {
      const profile = await profileService.updateCurrent(request);
      if (generation === currentGeneration) {
        set({
          currentProfile: profile,
          currentProfileStatus: "loaded",
          currentProfileError: null,
        });
        const auth = useAuthStore.getState();
        if (auth.user && auth.user.id === profile.user.id) {
          auth.updateUser({ ...auth.user, fullName: profile.user.fullName });
        }
      }
      return profile;
    } catch (error) {
      const apiError = asApiError(error, "Unable to update your profile.");
      if (generation === currentGeneration) {
        set({ currentProfileStatus: "error", currentProfileError: apiError });
      }
      throw apiError;
    }
  },

  loadPublicProfile(username) {
    const normalized = normalizeProfileUsername(username);
    const cached = get().publicProfiles[normalized];
    if (cached) return Promise.resolve(cached);
    const existing = publicRequests.get(normalized);
    if (existing) return existing;

    set((state) => ({
      publicProfileStatuses: {
        ...state.publicProfileStatuses,
        [normalized]: "loading",
      },
      publicProfileErrors: {
        ...state.publicProfileErrors,
        [normalized]: null,
      },
    }));
    const request = profileService
      .getPublicByUsername(normalized)
      .then((profile) => {
        set((state) => ({
          publicProfiles: { ...state.publicProfiles, [normalized]: profile },
          publicProfileStatuses: {
            ...state.publicProfileStatuses,
            [normalized]: "loaded",
          },
        }));
        return profile;
      })
      .catch((error: unknown) => {
        const apiError = asApiError(error, "Unable to load this profile.");
        set((state) => ({
          publicProfileStatuses: {
            ...state.publicProfileStatuses,
            [normalized]: "error",
          },
          publicProfileErrors: {
            ...state.publicProfileErrors,
            [normalized]: apiError,
          },
        }));
        throw apiError;
      })
      .finally(() => {
        publicRequests.delete(normalized);
      });
    publicRequests.set(normalized, request);
    return request;
  },

  clearCurrentProfile() {
    currentGeneration += 1;
    currentRequest = null;
    set({
      currentProfile: null,
      currentProfileStatus: "idle",
      currentProfileError: null,
    });
  },

  clearAllProfileState() {
    currentGeneration += 1;
    currentRequest = null;
    publicRequests.clear();
    set({
      currentProfile: null,
      currentProfileStatus: "idle",
      currentProfileError: null,
      publicProfiles: {},
      publicProfileStatuses: {},
      publicProfileErrors: {},
    });
  },
}));

profileStateCoordinator.configure(() =>
  useProfileStore.getState().clearCurrentProfile(),
);
