"use client";

import { create } from "zustand";
import { ApiError } from "@/services/api/apiClient";
import { jobsService } from "@/services/api/jobs.service";
import { jobsStateCoordinator } from "@/services/jobs/jobsStateCoordinator";
import { jobApplicationCountCoordinator } from "@/services/jobs/jobApplicationCountCoordinator";
import type {
  CreateJobRequest, Job, JobFilters, JobPage, JobPageMetadata, JobPaginationParams, UpdateJobRequest,
} from "@/types/jobs";

export type JobsStatus = "idle" | "loading" | "loaded" | "error";
type State = {
  globalJobs: Job[]; globalPageMetadata: JobPageMetadata | null; globalStatus: JobsStatus; globalError: ApiError | null;
  myJobs: Job[]; myPageMetadata: JobPageMetadata | null; myStatus: JobsStatus; myError: ApiError | null;
  filters: JobFilters; createStatus: JobsStatus; createError: ApiError | null;
  updateStatusById: Record<string, JobsStatus>; updateErrorById: Record<string, ApiError | null>;
  transitionStatusById: Record<string, JobsStatus>; transitionErrorById: Record<string, ApiError | null>;
  deleteStatusById: Record<string, JobsStatus>; deleteErrorById: Record<string, ApiError | null>;
  loadGlobalJobs: (params?: JobPaginationParams) => Promise<void>;
  loadMyJobs: (params?: JobPaginationParams) => Promise<void>;
  setFilters: (filters: JobFilters) => void;
  createJob: (request: CreateJobRequest) => Promise<Job>;
  updateJob: (id: string, request: UpdateJobRequest) => Promise<Job>;
  closeJob: (id: string) => Promise<Job>; reopenJob: (id: string) => Promise<Job>;
  deleteJob: (id: string) => Promise<void>; clearMyJobs: () => void; clearErrors: () => void;
};
type SetState = (
  partial: Partial<State> | ((state: State) => Partial<State>),
) => void;
type GetState = () => State;

let globalRequest: Promise<void> | null = null;
let myRequest: Promise<void> | null = null;
const errorOf = (error: unknown, message: string) =>
  error instanceof ApiError ? error : new ApiError(0, "NETWORK_ERROR", message);
const meta = (page: JobPage): JobPageMetadata => ({
  page: page.page, size: page.size, totalElements: page.totalElements, totalPages: page.totalPages,
  first: page.first, last: page.last,
});
const adjust = (value: JobPageMetadata | null, delta: number): JobPageMetadata | null => {
  if (!value) return null;
  const totalElements = Math.max(0, value.totalElements + delta);
  const totalPages = Math.ceil(totalElements / value.size);
  return { ...value, totalElements, totalPages, last: value.page >= Math.max(0, totalPages - 1) };
};
const replace = (values: Job[], job: Job) => values.map((value) => value.id === job.id ? job : value);

export const useJobsStore = create<State>()((set, get) => ({
  globalJobs: [], globalPageMetadata: null, globalStatus: "idle", globalError: null,
  myJobs: [], myPageMetadata: null, myStatus: "idle", myError: null, filters: { status: "OPEN" },
  createStatus: "idle", createError: null, updateStatusById: {}, updateErrorById: {},
  transitionStatusById: {}, transitionErrorById: {}, deleteStatusById: {}, deleteErrorById: {},

  loadGlobalJobs(supplied) {
    if (globalRequest) return globalRequest;
    const current = get();
    const params = {
      page: supplied?.page ?? current.globalPageMetadata?.page ?? 0,
      size: supplied?.size ?? current.globalPageMetadata?.size ?? 20,
      ...current.filters, ...supplied,
    };
    globalRequest = (async () => {
      set({ globalStatus: "loading", globalError: null });
      try {
        const page = await jobsService.getGlobal(params);
        set({ globalJobs: page.content, globalPageMetadata: meta(page), globalStatus: "loaded" });
      } catch (error) {
        const mapped = errorOf(error, "Jobs could not be loaded.");
        set({ globalStatus: "error", globalError: mapped }); throw mapped;
      } finally { globalRequest = null; }
    })();
    return globalRequest;
  },
  loadMyJobs(supplied) {
    if (myRequest) return myRequest;
    const current = get();
    const params = { page: supplied?.page ?? current.myPageMetadata?.page ?? 0,
      size: supplied?.size ?? current.myPageMetadata?.size ?? 20, status: supplied?.status };
    myRequest = (async () => {
      set({ myStatus: "loading", myError: null });
      try {
        const page = await jobsService.getMine(params);
        set({ myJobs: page.content, myPageMetadata: meta(page), myStatus: "loaded" });
      } catch (error) {
        const mapped = errorOf(error, "Your jobs could not be loaded.");
        set({ myStatus: "error", myError: mapped }); throw mapped;
      } finally { myRequest = null; }
    })();
    return myRequest;
  },
  setFilters(filters) {
    set({ filters, globalPageMetadata: null, globalStatus: "idle", globalError: null });
  },
  async createJob(request) {
    set({ createStatus: "loading", createError: null });
    try {
      const job = await jobsService.create(request);
      set((state) => {
        const visible = state.filters.status !== "CLOSED"
          && (!state.filters.category || state.filters.category === job.category)
          && (!state.filters.workMode || state.filters.workMode === job.workMode);
        return {
          createStatus: "loaded",
          myJobs: state.myStatus === "loaded" ? [job, ...state.myJobs.filter(({ id }) => id !== job.id)] : state.myJobs,
          myPageMetadata: state.myStatus === "loaded" ? adjust(state.myPageMetadata, 1) : state.myPageMetadata,
          globalJobs: state.globalStatus === "loaded" && visible
            ? [job, ...state.globalJobs.filter(({ id }) => id !== job.id)] : state.globalJobs,
          globalPageMetadata: state.globalStatus === "loaded" && visible
            ? adjust(state.globalPageMetadata, 1) : state.globalPageMetadata,
        };
      });
      return job;
    } catch (error) {
      const mapped = errorOf(error, "The job could not be created.");
      set({ createStatus: "error", createError: mapped }); throw mapped;
    }
  },
  async updateJob(id, request) {
    if (get().updateStatusById[id] === "loading") throw new ApiError(409, "JOB_UPDATE_PENDING", "Update pending.");
    set((state) => ({ updateStatusById: { ...state.updateStatusById, [id]: "loading" },
      updateErrorById: { ...state.updateErrorById, [id]: null } }));
    try {
      const job = await jobsService.update(id, request);
      set((state) => ({ myJobs: replace(state.myJobs, job), globalJobs: replace(state.globalJobs, job),
        updateStatusById: { ...state.updateStatusById, [id]: "loaded" } }));
      return job;
    } catch (error) {
      const mapped = errorOf(error, "The job could not be updated.");
      set((state) => ({ updateStatusById: { ...state.updateStatusById, [id]: "error" },
        updateErrorById: { ...state.updateErrorById, [id]: mapped } })); throw mapped;
    }
  },
  async closeJob(id) { return transition(id, jobsService.close, set, get); },
  async reopenJob(id) { return transition(id, jobsService.reopen, set, get); },
  async deleteJob(id) {
    if (get().deleteStatusById[id] === "loading") return;
    set((state) => ({ deleteStatusById: { ...state.deleteStatusById, [id]: "loading" },
      deleteErrorById: { ...state.deleteErrorById, [id]: null } }));
    try {
      await jobsService.delete(id);
      set((state) => {
        const inMine = state.myJobs.some((job) => job.id === id);
        const inGlobal = state.globalJobs.some((job) => job.id === id);
        return { myJobs: state.myJobs.filter((job) => job.id !== id),
          globalJobs: state.globalJobs.filter((job) => job.id !== id),
          myPageMetadata: inMine ? adjust(state.myPageMetadata, -1) : state.myPageMetadata,
          globalPageMetadata: inGlobal ? adjust(state.globalPageMetadata, -1) : state.globalPageMetadata,
          deleteStatusById: { ...state.deleteStatusById, [id]: "loaded" } };
      });
    } catch (error) {
      const mapped = errorOf(error, "The job could not be deleted.");
      set((state) => ({ deleteStatusById: { ...state.deleteStatusById, [id]: "error" },
        deleteErrorById: { ...state.deleteErrorById, [id]: mapped } })); throw mapped;
    }
  },
  clearMyJobs() {
    myRequest = null;
    set({ myJobs: [], myPageMetadata: null, myStatus: "idle", myError: null,
      createStatus: "idle", createError: null, updateStatusById: {}, updateErrorById: {},
      transitionStatusById: {}, transitionErrorById: {}, deleteStatusById: {}, deleteErrorById: {} });
  },
  clearErrors() { set({ globalError: null, myError: null, createError: null,
    updateErrorById: {}, transitionErrorById: {}, deleteErrorById: {} }); },
}));

async function transition(
  id: string, request: (id: string) => Promise<Job>,
  set: SetState,
  get: GetState,
): Promise<Job> {
  if (get().transitionStatusById[id] === "loading") throw new ApiError(409, "JOB_TRANSITION_PENDING", "Change pending.");
  set((state) => ({ transitionStatusById: { ...state.transitionStatusById, [id]: "loading" },
    transitionErrorById: { ...state.transitionErrorById, [id]: null } }));
  try {
    const job = await request(id);
    set((state) => {
      const belongs = !state.filters.status || state.filters.status === job.status;
      return { myJobs: replace(state.myJobs, job),
        globalJobs: belongs ? replace(state.globalJobs, job) : state.globalJobs.filter((item) => item.id !== id),
        globalPageMetadata: belongs || !state.globalJobs.some((item) => item.id === id)
          ? state.globalPageMetadata : adjust(state.globalPageMetadata, -1),
        transitionStatusById: { ...state.transitionStatusById, [id]: "loaded" } };
    });
    return job;
  } catch (error) {
    const mapped = errorOf(error, "The job status could not be changed.");
    set((state) => ({ transitionStatusById: { ...state.transitionStatusById, [id]: "error" },
      transitionErrorById: { ...state.transitionErrorById, [id]: mapped } })); throw mapped;
  }
}

jobsStateCoordinator.configure((authenticated) => {
  const state = useJobsStore.getState();
  const loaded = state.globalStatus === "loaded" || state.globalStatus === "error";
  state.clearMyJobs();
  globalRequest = null;
  useJobsStore.setState((current) => ({
    globalJobs: authenticated ? current.globalJobs : current.globalJobs.map((job) => ({ ...job, ownedByCurrentUser: false })),
    globalStatus: loaded ? "idle" : current.globalStatus,
  }));
  if (loaded) void state.loadGlobalJobs().catch(() => undefined);
});

jobApplicationCountCoordinator.configure((jobId, delta) => {
  useJobsStore.setState((state) => ({
    globalJobs: state.globalJobs.map((job) =>
      job.id === jobId
        ? { ...job, applicationCount: Math.max(0, job.applicationCount + delta) }
        : job,
    ),
    myJobs: state.myJobs.map((job) =>
      job.id === jobId
        ? { ...job, applicationCount: Math.max(0, job.applicationCount + delta) }
        : job,
    ),
  }));
});
