import type { WorkType } from "@/types/works";

export const WORK_TYPES = [
  "Video",
  "Photo",
  "Other",
] as const satisfies readonly WorkType[];
