import type { JobCategory } from "@/types/jobs";

export const JOB_CATEGORIES = [
  "Volunteer",
  "Student",
  "Amateur",
  "Professional",
] as const satisfies readonly JobCategory[];
