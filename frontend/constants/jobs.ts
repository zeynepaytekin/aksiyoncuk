import type { CompensationType, JobCategory, JobStatus, WorkMode } from "@/types/jobs";

export const JOB_CATEGORIES: readonly { value: JobCategory; label: string }[] = [
  { value: "VOLUNTEER", label: "Volunteer" },
  { value: "STUDENT", label: "Student" },
  { value: "AMATEUR", label: "Amateur" },
  { value: "PROFESSIONAL", label: "Professional" },
];
export const WORK_MODES: readonly { value: WorkMode; label: string }[] = [
  { value: "ONSITE", label: "On-site" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
];
export const COMPENSATION_TYPES: readonly { value: CompensationType; label: string }[] = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "FIXED", label: "Fixed" },
  { value: "NEGOTIABLE", label: "Negotiable" },
];
export const JOB_STATUSES: readonly { value: JobStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
];

export function enumLabel(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}
