export const WORK_TYPE_VALUES = [
  "FILM",
  "SHORT_FILM",
  "DOCUMENTARY",
  "SERIES",
  "COMMERCIAL",
  "MUSIC_VIDEO",
  "PHOTOGRAPHY",
  "THEATRE",
  "OTHER",
] as const;

export type WorkType = (typeof WORK_TYPE_VALUES)[number];

export type WorkOwner = {
  id: string;
  username: string;
  fullName: string;
  professionalTitle: string | null;
};

export type Work = {
  id: string;
  title: string;
  description: string | null;
  workType: WorkType;
  projectUrl: string | null;
  releaseYear: number | null;
  createdAt: string;
  updatedAt: string;
  owner: WorkOwner;
  ownedByCurrentUser: boolean;
  media?: MediaListItem[];
};

export type WorkPage = {
  content: Work[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type CreateWorkRequest = {
  title: string;
  description: string | null;
  workType: WorkType;
  projectUrl: string | null;
  releaseYear: number | null;
};

export type UpdateWorkRequest = {
  title?: string;
  description?: string | null;
  workType?: WorkType;
  projectUrl?: string | null;
  releaseYear?: number | null;
};

export type WorkPaginationParams = {
  page?: number;
  size?: number;
};

export type WorkPageMetadata = Omit<WorkPage, "content">;
import type { MediaListItem } from "./media";
