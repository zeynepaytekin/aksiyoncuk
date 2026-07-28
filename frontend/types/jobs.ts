export type JobCategory =
  | "Volunteer"
  | "Student"
  | "Amateur"
  | "Professional";

export type Job = {
  id: number;
  userEmail: string;
  title: string;
  description: string;
  category: JobCategory;
  location: string;
  createdAt: string;
};
