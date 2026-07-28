export type WorkType = "Video" | "Photo" | "Other";

export type Work = {
  id: number;
  userEmail: string;
  title: string;
  description: string;
  type: WorkType;
  createdAt: string;
};
