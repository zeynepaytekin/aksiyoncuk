import type { WorkType } from "@/types/works";

export const WORK_TYPES: readonly {
  value: WorkType;
  label: string;
}[] = [
  { value: "FILM", label: "Film" },
  { value: "SHORT_FILM", label: "Short Film" },
  { value: "DOCUMENTARY", label: "Documentary" },
  { value: "SERIES", label: "Series" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "MUSIC_VIDEO", label: "Music Video" },
  { value: "PHOTOGRAPHY", label: "Photography" },
  { value: "THEATRE", label: "Theatre" },
  { value: "OTHER", label: "Other" },
];

export function getWorkTypeLabel(type: WorkType): string {
  return WORK_TYPES.find(({ value }) => value === type)?.label ?? type;
}
