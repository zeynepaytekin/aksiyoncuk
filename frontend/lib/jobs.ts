export type Job = {
  id: number;
  userEmail: string;
  title: string;
  description: string;
  category: "Volunteer" | "Student" | "Amateur" | "Professional";
  location: string;
  createdAt: string;
};

const JOBS_KEY = "aksiyoncuk_jobs";

export function getJobs(): Job[] {
  const raw = localStorage.getItem(JOBS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Job[];
  } catch {
    return [];
  }
}

export function saveJobs(jobs: Job[]) {
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}

export function addJob(job: Job) {
  const jobs = getJobs();
  saveJobs([job, ...jobs]);
}