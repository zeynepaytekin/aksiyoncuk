export type Work = {
  id: number;
  userEmail: string;
  title: string;
  description: string;
  type: "Video" | "Photo" | "Other";
  createdAt: string;
};

const WORKS_KEY = "aksiyoncuk_works";

export function getWorks(): Work[] {
  const raw = localStorage.getItem(WORKS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Work[];
  } catch {
    return [];
  }
}

export function saveWorks(works: Work[]) {
  localStorage.setItem(WORKS_KEY, JSON.stringify(works));
}

export function addWork(work: Work) {
  const works = getWorks();
  saveWorks([work, ...works]);
}