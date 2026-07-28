"use client";

import { create } from "zustand";

import { ApiError } from "@/services/api/apiClient";
import { worksService } from "@/services/api/works.service";
import { worksStateCoordinator } from "@/services/works/worksStateCoordinator";
import type {
  CreateWorkRequest,
  UpdateWorkRequest,
  Work,
  WorkPage,
  WorkPageMetadata,
  WorkPaginationParams,
} from "@/types/works";

export type WorksStatus = "idle" | "loading" | "loaded" | "error";

type WorksState = {
  myWorks: Work[];
  myPageMetadata: WorkPageMetadata | null;
  myStatus: WorksStatus;
  myError: ApiError | null;
  publicWorksByUsername: Record<string, Work[]>;
  publicPageMetadataByUsername: Record<
    string,
    WorkPageMetadata | undefined
  >;
  publicStatusByUsername: Record<string, WorksStatus>;
  publicErrorByUsername: Record<string, ApiError | null>;
  createStatus: WorksStatus;
  createError: ApiError | null;
  updateStatusById: Record<string, WorksStatus>;
  updateErrorById: Record<string, ApiError | null>;
  deleteStatusById: Record<string, WorksStatus>;
  deleteErrorById: Record<string, ApiError | null>;
  loadMyWorks: (params?: WorkPaginationParams) => Promise<void>;
  loadPublicWorks: (
    username: string,
    params?: WorkPaginationParams,
  ) => Promise<void>;
  createWork: (request: CreateWorkRequest) => Promise<Work>;
  updateWork: (workId: string, request: UpdateWorkRequest) => Promise<Work>;
  deleteWork: (workId: string) => Promise<void>;
  clearMyWorks: () => void;
  clearPublicWorks: (username?: string) => void;
  clearErrors: () => void;
};

const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 20;
let myGeneration = 0;
let myRequest: Promise<void> | null = null;
const publicRequests = new Map<string, Promise<void>>();
const publicGenerations = new Map<string, number>();

export function normalizeWorkUsername(username: string): string {
  return username.trim().toLowerCase();
}

function apiError(error: unknown, fallback: string): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(0, "NETWORK_ERROR", fallback);
}

function metadata(page: WorkPage): WorkPageMetadata {
  return {
    page: page.page,
    size: page.size,
    totalElements: page.totalElements,
    totalPages: page.totalPages,
    first: page.first,
    last: page.last,
  };
}

function params(
  supplied: WorkPaginationParams | undefined,
  current: WorkPageMetadata | null | undefined,
): Required<WorkPaginationParams> {
  return {
    page: supplied?.page ?? current?.page ?? DEFAULT_PAGE,
    size: supplied?.size ?? current?.size ?? DEFAULT_SIZE,
  };
}

function adjust(
  value: WorkPageMetadata | null | undefined,
  delta: number,
): WorkPageMetadata | null | undefined {
  if (!value) return value;
  const totalElements = Math.max(0, value.totalElements + delta);
  const totalPages = Math.ceil(totalElements / value.size);
  return {
    ...value,
    totalElements,
    totalPages,
    last: value.page >= Math.max(0, totalPages - 1),
  };
}

function replace(works: Work[], work: Work): Work[] {
  return works.map((current) => (current.id === work.id ? work : current));
}

export const useWorksStore = create<WorksState>()((set, get) => ({
  myWorks: [],
  myPageMetadata: null,
  myStatus: "idle",
  myError: null,
  publicWorksByUsername: {},
  publicPageMetadataByUsername: {},
  publicStatusByUsername: {},
  publicErrorByUsername: {},
  createStatus: "idle",
  createError: null,
  updateStatusById: {},
  updateErrorById: {},
  deleteStatusById: {},
  deleteErrorById: {},

  loadMyWorks(supplied) {
    if (myRequest) return myRequest;
    const generation = myGeneration;
    const requested = params(supplied, get().myPageMetadata);
    myRequest = (async () => {
      set({ myStatus: "loading", myError: null });
      try {
        const page = await worksService.getMine(requested);
        if (generation === myGeneration) {
          set({
            myWorks: page.content,
            myPageMetadata: metadata(page),
            myStatus: "loaded",
          });
        }
      } catch (error) {
        const mapped = apiError(error, "Your works could not be loaded.");
        if (generation === myGeneration) {
          set({ myStatus: "error", myError: mapped });
        }
        throw mapped;
      } finally {
        myRequest = null;
      }
    })();
    return myRequest;
  },

  loadPublicWorks(username, supplied) {
    const normalized = normalizeWorkUsername(username);
    const requested = params(
      supplied,
      get().publicPageMetadataByUsername[normalized],
    );
    const key = `${normalized}:${requested.page}:${requested.size}`;
    const existing = publicRequests.get(key);
    if (existing) return existing;
    const generation = (publicGenerations.get(normalized) ?? 0) + 1;
    publicGenerations.set(normalized, generation);
    const request = (async () => {
      set((state) => ({
        publicStatusByUsername: {
          ...state.publicStatusByUsername,
          [normalized]: "loading",
        },
        publicErrorByUsername: {
          ...state.publicErrorByUsername,
          [normalized]: null,
        },
      }));
      try {
        const page = await worksService.getPublicByUsername(
          normalized,
          requested,
        );
        if (publicGenerations.get(normalized) === generation) {
          set((state) => ({
            publicWorksByUsername: {
              ...state.publicWorksByUsername,
              [normalized]: page.content,
            },
            publicPageMetadataByUsername: {
              ...state.publicPageMetadataByUsername,
              [normalized]: metadata(page),
            },
            publicStatusByUsername: {
              ...state.publicStatusByUsername,
              [normalized]: "loaded",
            },
          }));
        }
      } catch (error) {
        const mapped = apiError(error, "Public works could not be loaded.");
        if (publicGenerations.get(normalized) === generation) {
          set((state) => ({
            publicStatusByUsername: {
              ...state.publicStatusByUsername,
              [normalized]: "error",
            },
            publicErrorByUsername: {
              ...state.publicErrorByUsername,
              [normalized]: mapped,
            },
          }));
        }
        throw mapped;
      } finally {
        publicRequests.delete(key);
      }
    })();
    publicRequests.set(key, request);
    return request;
  },

  async createWork(request) {
    set({ createStatus: "loading", createError: null });
    try {
      const work = await worksService.create(request);
      set((state) => ({
        createStatus: "loaded",
        myWorks:
          state.myStatus === "loaded"
            ? [work, ...state.myWorks.filter(({ id }) => id !== work.id)]
            : state.myWorks,
        myPageMetadata:
          state.myStatus === "loaded"
            ? (adjust(state.myPageMetadata, 1) ?? null)
            : state.myPageMetadata,
      }));
      return work;
    } catch (error) {
      const mapped = apiError(error, "The work could not be created.");
      set({ createStatus: "error", createError: mapped });
      throw mapped;
    }
  },

  async updateWork(workId, request) {
    if (get().updateStatusById[workId] === "loading") {
      throw new ApiError(409, "WORK_UPDATE_PENDING", "Update already pending.");
    }
    set((state) => ({
      updateStatusById: { ...state.updateStatusById, [workId]: "loading" },
      updateErrorById: { ...state.updateErrorById, [workId]: null },
    }));
    try {
      const work = await worksService.update(workId, request);
      set((state) => ({
        myWorks: replace(state.myWorks, work),
        publicWorksByUsername: Object.fromEntries(
          Object.entries(state.publicWorksByUsername).map(([key, works]) => [
            key,
            replace(works, work),
          ]),
        ),
        updateStatusById: {
          ...state.updateStatusById,
          [workId]: "loaded",
        },
      }));
      return work;
    } catch (error) {
      const mapped = apiError(error, "The work could not be updated.");
      set((state) => ({
        updateStatusById: {
          ...state.updateStatusById,
          [workId]: "error",
        },
        updateErrorById: { ...state.updateErrorById, [workId]: mapped },
      }));
      throw mapped;
    }
  },

  async deleteWork(workId) {
    if (get().deleteStatusById[workId] === "loading") return;
    set((state) => ({
      deleteStatusById: { ...state.deleteStatusById, [workId]: "loading" },
      deleteErrorById: { ...state.deleteErrorById, [workId]: null },
    }));
    try {
      await worksService.delete(workId);
      set((state) => {
        const removedFromMine = state.myWorks.some(({ id }) => id === workId);
        const publicWorksByUsername = Object.fromEntries(
          Object.entries(state.publicWorksByUsername).map(([key, works]) => [
            key,
            works.filter(({ id }) => id !== workId),
          ]),
        );
        const publicPageMetadataByUsername = Object.fromEntries(
          Object.entries(state.publicPageMetadataByUsername).map(
            ([key, value]) => [
              key,
              state.publicWorksByUsername[key]?.some(({ id }) => id === workId)
                ? (adjust(value ?? undefined, -1) ?? undefined)
                : value,
            ],
          ),
        );
        return {
          myWorks: state.myWorks.filter(({ id }) => id !== workId),
          myPageMetadata: removedFromMine
            ? (adjust(state.myPageMetadata, -1) ?? null)
            : state.myPageMetadata,
          publicWorksByUsername,
          publicPageMetadataByUsername,
          deleteStatusById: {
            ...state.deleteStatusById,
            [workId]: "loaded",
          },
        };
      });
    } catch (error) {
      const mapped = apiError(error, "The work could not be deleted.");
      set((state) => ({
        deleteStatusById: {
          ...state.deleteStatusById,
          [workId]: "error",
        },
        deleteErrorById: { ...state.deleteErrorById, [workId]: mapped },
      }));
      throw mapped;
    }
  },

  clearMyWorks() {
    myGeneration += 1;
    myRequest = null;
    set({
      myWorks: [],
      myPageMetadata: null,
      myStatus: "idle",
      myError: null,
      createStatus: "idle",
      createError: null,
      updateStatusById: {},
      updateErrorById: {},
      deleteStatusById: {},
      deleteErrorById: {},
    });
  },

  clearPublicWorks(username) {
    if (!username) {
      publicRequests.clear();
      publicGenerations.clear();
      set({
        publicWorksByUsername: {},
        publicPageMetadataByUsername: {},
        publicStatusByUsername: {},
        publicErrorByUsername: {},
      });
      return;
    }
    const normalized = normalizeWorkUsername(username);
    publicGenerations.set(
      normalized,
      (publicGenerations.get(normalized) ?? 0) + 1,
    );
    set((state) => ({
      publicWorksByUsername: Object.fromEntries(
        Object.entries(state.publicWorksByUsername).filter(
          ([key]) => key !== normalized,
        ),
      ),
      publicPageMetadataByUsername: Object.fromEntries(
        Object.entries(state.publicPageMetadataByUsername).filter(
          ([key]) => key !== normalized,
        ),
      ),
      publicStatusByUsername: {
        ...state.publicStatusByUsername,
        [normalized]: "idle",
      },
      publicErrorByUsername: {
        ...state.publicErrorByUsername,
        [normalized]: null,
      },
    }));
  },

  clearErrors() {
    set({
      myError: null,
      createError: null,
      publicErrorByUsername: {},
      updateErrorById: {},
      deleteErrorById: {},
    });
  },
}));

worksStateCoordinator.configure((authenticated) => {
  const state = useWorksStore.getState();
  const loadedPublic = Object.entries(state.publicStatusByUsername)
    .filter(([, status]) => status === "loaded" || status === "error")
    .map(([username]) => username);
  const pages = Object.fromEntries(
    loadedPublic.map((username) => [
      username,
      state.publicPageMetadataByUsername[username],
    ]),
  );
  state.clearMyWorks();
  publicRequests.clear();
  useWorksStore.setState((current) => ({
    publicWorksByUsername: Object.fromEntries(
      Object.entries(current.publicWorksByUsername).map(([key, works]) => [
        key,
        authenticated
          ? works
          : works.map((work) => ({ ...work, ownedByCurrentUser: false })),
      ]),
    ),
    publicStatusByUsername: {
      ...current.publicStatusByUsername,
      ...Object.fromEntries(
        loadedPublic.map((username) => [username, "idle" as const]),
      ),
    },
  }));
  for (const username of loadedPublic) {
    const page = pages[username];
    void state
      .loadPublicWorks(
        username,
        page ? { page: page.page, size: page.size } : undefined,
      )
      .catch(() => undefined);
  }
});
