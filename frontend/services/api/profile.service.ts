import { apiRequest } from "@/services/api/apiClient";
import type {
  CurrentProfile,
  PublicProfile,
  UpdateProfileRequest,
} from "@/types/profile";

function definedPatch(request: UpdateProfileRequest): UpdateProfileRequest {
  return Object.fromEntries(
    Object.entries(request).filter(([, value]) => value !== undefined),
  ) as UpdateProfileRequest;
}

export type ProfileService = {
  getCurrent: () => Promise<CurrentProfile>;
  updateCurrent: (request: UpdateProfileRequest) => Promise<CurrentProfile>;
  getPublicByUsername: (username: string) => Promise<PublicProfile>;
};

export const profileService: ProfileService = {
  getCurrent() {
    return apiRequest("/profiles/me", { authenticated: true });
  },

  updateCurrent(request) {
    return apiRequest("/profiles/me", {
      method: "PATCH",
      authenticated: true,
      body: definedPatch(request),
    });
  },

  getPublicByUsername(username) {
    return apiRequest(`/profiles/${encodeURIComponent(username)}`);
  },
};
