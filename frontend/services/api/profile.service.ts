import { authService } from "@/services/api/auth.service";
import { jobsService } from "@/services/api/jobs.service";
import { postsService } from "@/services/api/posts.service";
import { worksService } from "@/services/api/works.service";
import type { User } from "@/types/auth";
import type { ProfileContentData } from "@/types/profile";

export type ProfileService = {
  getContent: (email: string) => Promise<ProfileContentData>;
  update: (user: User) => Promise<User>;
};

export const profileService: ProfileService = {
  async getContent(email) {
    const [posts, jobs, works] = await Promise.all([
      postsService.getByUserEmail(email),
      jobsService.getByUserEmail(email),
      worksService.getByUserEmail(email),
    ]);

    return { posts, jobs, works };
  },

  async update(user) {
    return authService.updateUser(user);
  },
};
