import { apiRequest } from "@/services/api/apiClient";
import { jobsService } from "@/services/api/jobs.service";
import { worksService } from "@/services/api/works.service";
import type {
  CurrentProfile,
  ProfileContentData,
  PublicProfile,
  UpdateProfileRequest,
} from "@/types/profile";

function definedPatch(request: UpdateProfileRequest): UpdateProfileRequest {
  return Object.fromEntries(
    Object.entries(request).filter(([, value]) => value !== undefined),
  ) as UpdateProfileRequest;
}

export type ProfileService = {
  getContent: (email: string) => Promise<ProfileContentData>;
  getCurrent: () => Promise<CurrentProfile>;
  updateCurrent: (request: UpdateProfileRequest) => Promise<CurrentProfile>;
  getPublicByUsername: (username: string) => Promise<PublicProfile>;
};

export const profileService: ProfileService = {
  async getContent(email) {
    const [jobs, works] = await Promise.all([
      jobsService.getByUserEmail(email),
      worksService.getByUserEmail(email),
    ]);
    return { jobs, works };
  },

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
