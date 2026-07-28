import type { Job } from "./jobs";

export type ProfileContentData = {
  jobs: Job[];
};

export type CurrentProfileUser = {
  id: string;
  email: string;
  username: string;
  fullName: string;
  status: string;
  createdAt: string;
};

export type CurrentProfile = {
  id: string;
  user: CurrentProfileUser;
  professionalTitle: string | null;
  bio: string | null;
  location: string | null;
  websiteUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicProfile = {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  status: string;
  professionalTitle: string | null;
  bio: string | null;
  location: string | null;
  websiteUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProfilePatchValue = string | null | undefined;

export type UpdateProfileRequest = {
  fullName?: string;
  professionalTitle?: string | null;
  bio?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
};
