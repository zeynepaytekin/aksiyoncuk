import type { Post } from "./feed";
import type { Job } from "./jobs";
import type { Work } from "./works";

export type ProfileContentData = {
  posts: Post[];
  jobs: Job[];
  works: Work[];
};
