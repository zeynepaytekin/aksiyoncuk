import type { Post } from "@/types/feed";

export const DEFAULT_POSTS: Post[] = [
  {
    id: 1,
    author: "Emma Wilson",
    content:
      "Looking for a color grading specialist for an upcoming short film project.",
    createdAt: "Today",
    likes: 3,
    isLiked: false,
    comments: [],
    userEmail: "",
  },
  {
    id: 2,
    author: "Luca Moretti",
    content:
      "Just published a new portfolio piece. Feedback from the community is welcome.",
    createdAt: "Today",
    likes: 7,
    isLiked: false,
    comments: [],
    userEmail: "",
  },
];
