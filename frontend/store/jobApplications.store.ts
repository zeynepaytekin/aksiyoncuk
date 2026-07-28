"use client";

import { create } from "zustand";
import { ApiError } from "@/services/api/apiClient";
import { jobApplicationsService } from "@/services/api/jobApplications.service";
import { jobApplicationsStateCoordinator } from "@/services/jobApplications/jobApplicationsStateCoordinator";
import { jobApplicationCountCoordinator } from "@/services/jobs/jobApplicationCountCoordinator";
import type {
  JobApplication,
  JobApplicationPage,
  JobApplicationPageMetadata,
  JobApplicationPaginationParams,
} from "@/types/jobApplications";

export type JobApplicationStoreStatus =
  | "idle"
  | "loading"
  | "loaded"
  | "error";

type State = {
  myApplications: JobApplication[];
  myPageMetadata: JobApplicationPageMetadata | null;
  myStatus: JobApplicationStoreStatus;
  myError: ApiError | null;
  applicationsByJobId: Record<string, JobApplication[]>;
  pageMetadataByJobId: Record<string, JobApplicationPageMetadata | null>;
  statusByJobId: Record<string, JobApplicationStoreStatus>;
  errorByJobId: Record<string, ApiError | null>;
  applyStatusByJobId: Record<string, JobApplicationStoreStatus>;
  applyErrorByJobId: Record<string, ApiError | null>;
  transitionStatusByApplicationId: Record<string, JobApplicationStoreStatus>;
  transitionErrorByApplicationId: Record<string, ApiError | null>;
  loadMyApplications: (
    params?: JobApplicationPaginationParams,
  ) => Promise<void>;
  loadApplicationsForJob: (
    jobId: string,
    params?: JobApplicationPaginationParams,
  ) => Promise<void>;
  applyToJob: (
    jobId: string,
    coverLetter: string | null,
  ) => Promise<JobApplication>;
  withdrawApplication: (id: string) => Promise<JobApplication>;
  acceptApplication: (id: string) => Promise<JobApplication>;
  rejectApplication: (id: string) => Promise<JobApplication>;
  clearPrivateApplications: () => void;
  clearErrors: () => void;
};

let myRequest: Promise<void> | null = null;
const jobRequests = new Map<string, Promise<void>>();

function errorOf(error: unknown, fallback: string): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(0, "NETWORK_ERROR", fallback);
}

const metadata = (page: JobApplicationPage): JobApplicationPageMetadata => ({
  page: page.page,
  size: page.size,
  totalElements: page.totalElements,
  totalPages: page.totalPages,
  first: page.first,
  last: page.last,
});

function increment(
  value: JobApplicationPageMetadata | null,
): JobApplicationPageMetadata | null {
  if (!value) return null;
  const totalElements = value.totalElements + 1;
  return {
    ...value,
    totalElements,
    totalPages: Math.ceil(totalElements / value.size),
    last: value.page >= Math.max(0, Math.ceil(totalElements / value.size) - 1),
  };
}

function replace(
  values: JobApplication[],
  application: JobApplication,
): JobApplication[] {
  return values.map((value) =>
    value.id === application.id ? application : value,
  );
}

export const useJobApplicationsStore = create<State>()((set, get) => ({
  myApplications: [],
  myPageMetadata: null,
  myStatus: "idle",
  myError: null,
  applicationsByJobId: {},
  pageMetadataByJobId: {},
  statusByJobId: {},
  errorByJobId: {},
  applyStatusByJobId: {},
  applyErrorByJobId: {},
  transitionStatusByApplicationId: {},
  transitionErrorByApplicationId: {},

  loadMyApplications(params) {
    if (myRequest) return myRequest;
    const current = get();
    const request = {
      page: params?.page ?? current.myPageMetadata?.page ?? 0,
      size: params?.size ?? current.myPageMetadata?.size ?? 20,
      status: params?.status,
    };
    myRequest = (async () => {
      set({ myStatus: "loading", myError: null });
      try {
        const page = await jobApplicationsService.getMine(request);
        set({
          myApplications: page.content,
          myPageMetadata: metadata(page),
          myStatus: "loaded",
        });
      } catch (error) {
        const mapped = errorOf(error, "Applications could not be loaded.");
        set({ myStatus: "error", myError: mapped });
        throw mapped;
      } finally {
        myRequest = null;
      }
    })();
    return myRequest;
  },

  loadApplicationsForJob(jobId, params) {
    const key = `${jobId}:${params?.page ?? 0}:${params?.size ?? 20}:${params?.status ?? ""}`;
    const existing = jobRequests.get(key);
    if (existing) return existing;
    const request = (async () => {
      set((state) => ({
        statusByJobId: { ...state.statusByJobId, [jobId]: "loading" },
        errorByJobId: { ...state.errorByJobId, [jobId]: null },
      }));
      try {
        const page = await jobApplicationsService.getForJob(jobId, params);
        set((state) => ({
          applicationsByJobId: {
            ...state.applicationsByJobId,
            [jobId]: page.content,
          },
          pageMetadataByJobId: {
            ...state.pageMetadataByJobId,
            [jobId]: metadata(page),
          },
          statusByJobId: { ...state.statusByJobId, [jobId]: "loaded" },
        }));
      } catch (error) {
        const mapped = errorOf(error, "Applicants could not be loaded.");
        set((state) => ({
          statusByJobId: { ...state.statusByJobId, [jobId]: "error" },
          errorByJobId: { ...state.errorByJobId, [jobId]: mapped },
        }));
        throw mapped;
      } finally {
        jobRequests.delete(key);
      }
    })();
    jobRequests.set(key, request);
    return request;
  },

  async applyToJob(jobId, coverLetter) {
    if (get().applyStatusByJobId[jobId] === "loading") {
      throw new ApiError(409, "APPLICATION_PENDING", "Application pending.");
    }
    set((state) => ({
      applyStatusByJobId: { ...state.applyStatusByJobId, [jobId]: "loading" },
      applyErrorByJobId: { ...state.applyErrorByJobId, [jobId]: null },
    }));
    try {
      const application = await jobApplicationsService.apply(jobId, {
        coverLetter,
      });
      set((state) => {
        const ownerCache = state.applicationsByJobId[jobId];
        return {
          applyStatusByJobId: {
            ...state.applyStatusByJobId,
            [jobId]: "loaded",
          },
          myApplications:
            state.myStatus === "loaded"
              ? [
                  application,
                  ...state.myApplications.filter(
                    ({ id }) => id !== application.id,
                  ),
                ]
              : state.myApplications,
          myPageMetadata:
            state.myStatus === "loaded"
              ? increment(state.myPageMetadata)
              : state.myPageMetadata,
          applicationsByJobId: ownerCache
            ? {
                ...state.applicationsByJobId,
                [jobId]: [
                  application,
                  ...ownerCache.filter(({ id }) => id !== application.id),
                ],
              }
            : state.applicationsByJobId,
          pageMetadataByJobId: ownerCache
            ? {
                ...state.pageMetadataByJobId,
                [jobId]: increment(state.pageMetadataByJobId[jobId] ?? null),
              }
            : state.pageMetadataByJobId,
        };
      });
      jobApplicationCountCoordinator.adjust(jobId, 1);
      return application;
    } catch (error) {
      const mapped = errorOf(error, "The application could not be submitted.");
      set((state) => ({
        applyStatusByJobId: {
          ...state.applyStatusByJobId,
          [jobId]: "error",
        },
        applyErrorByJobId: {
          ...state.applyErrorByJobId,
          [jobId]: mapped,
        },
      }));
      throw mapped;
    }
  },

  withdrawApplication(id) {
    return transition(id, jobApplicationsService.withdraw, set, get);
  },
  acceptApplication(id) {
    return transition(id, jobApplicationsService.accept, set, get);
  },
  rejectApplication(id) {
    return transition(id, jobApplicationsService.reject, set, get);
  },

  clearPrivateApplications() {
    myRequest = null;
    jobRequests.clear();
    set({
      myApplications: [],
      myPageMetadata: null,
      myStatus: "idle",
      myError: null,
      applicationsByJobId: {},
      pageMetadataByJobId: {},
      statusByJobId: {},
      errorByJobId: {},
      applyStatusByJobId: {},
      applyErrorByJobId: {},
      transitionStatusByApplicationId: {},
      transitionErrorByApplicationId: {},
    });
  },
  clearErrors() {
    set({
      myError: null,
      errorByJobId: {},
      applyErrorByJobId: {},
      transitionErrorByApplicationId: {},
    });
  },
}));

async function transition(
  id: string,
  request: (id: string) => Promise<JobApplication>,
  set: (
    partial: Partial<State> | ((state: State) => Partial<State>),
  ) => void,
  get: () => State,
): Promise<JobApplication> {
  if (get().transitionStatusByApplicationId[id] === "loading") {
    throw new ApiError(409, "APPLICATION_TRANSITION_PENDING", "Change pending.");
  }
  set((state) => ({
    transitionStatusByApplicationId: {
      ...state.transitionStatusByApplicationId,
      [id]: "loading",
    },
    transitionErrorByApplicationId: {
      ...state.transitionErrorByApplicationId,
      [id]: null,
    },
  }));
  try {
    const application = await request(id);
    set((state) => ({
      myApplications: replace(state.myApplications, application),
      applicationsByJobId: Object.fromEntries(
        Object.entries(state.applicationsByJobId).map(([jobId, values]) => [
          jobId,
          replace(values, application),
        ]),
      ),
      transitionStatusByApplicationId: {
        ...state.transitionStatusByApplicationId,
        [id]: "loaded",
      },
    }));
    return application;
  } catch (error) {
    const mapped = errorOf(error, "The application could not be changed.");
    set((state) => ({
      transitionStatusByApplicationId: {
        ...state.transitionStatusByApplicationId,
        [id]: "error",
      },
      transitionErrorByApplicationId: {
        ...state.transitionErrorByApplicationId,
        [id]: mapped,
      },
    }));
    throw mapped;
  }
}

jobApplicationsStateCoordinator.configure(() => {
  useJobApplicationsStore.getState().clearPrivateApplications();
});
