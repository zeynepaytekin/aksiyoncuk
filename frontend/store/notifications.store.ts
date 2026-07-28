"use client";

import { create } from "zustand";

import { ApiError } from "@/services/api/apiClient";
import { notificationsService } from "@/services/api/notifications.service";
import { notificationsStateCoordinator } from "@/services/notifications/notificationsStateCoordinator";
import type {
  Notification,
  NotificationFilters,
  NotificationPage,
  NotificationPageMetadata,
  NotificationQueryParams,
  NotificationSummary,
} from "@/types/notifications";

export type NotificationsStatus = "idle" | "loading" | "loaded" | "error";

type NotificationsState = {
  notifications: Notification[];
  pageMetadata: NotificationPageMetadata | null;
  status: NotificationsStatus;
  error: ApiError | null;
  filters: NotificationFilters;
  summary: NotificationSummary | null;
  summaryStatus: NotificationsStatus;
  summaryError: ApiError | null;
  mutationStatusById: Record<string, NotificationsStatus>;
  mutationErrorById: Record<string, ApiError | null>;
  markAllStatus: NotificationsStatus;
  markAllError: ApiError | null;
  loadNotifications: (params?: NotificationQueryParams) => Promise<void>;
  loadSummary: () => Promise<void>;
  setFilters: (filters: NotificationFilters) => void;
  markRead: (notificationId: string) => Promise<void>;
  markUnread: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  clearNotifications: () => void;
  clearErrors: () => void;
};

let listRequest: Promise<void> | null = null;
let listGeneration = 0;
let listRequestToken: symbol | null = null;
let summaryRequest: Promise<void> | null = null;
let summaryGeneration = 0;
let summaryRequestToken: symbol | null = null;
let mutationGeneration = 0;

const initialState = {
  notifications: [] as Notification[],
  pageMetadata: null as NotificationPageMetadata | null,
  status: "idle" as NotificationsStatus,
  error: null as ApiError | null,
  filters: {} as NotificationFilters,
  summary: null as NotificationSummary | null,
  summaryStatus: "idle" as NotificationsStatus,
  summaryError: null as ApiError | null,
  mutationStatusById: {} as Record<string, NotificationsStatus>,
  mutationErrorById: {} as Record<string, ApiError | null>,
  markAllStatus: "idle" as NotificationsStatus,
  markAllError: null as ApiError | null,
};

function apiError(error: unknown, message: string): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(0, "NETWORK_ERROR", message);
}

function metadata(page: NotificationPage): NotificationPageMetadata {
  return {
    page: page.page,
    size: page.size,
    totalElements: page.totalElements,
    totalPages: page.totalPages,
    first: page.first,
    last: page.last,
  };
}

export const useNotificationsStore = create<NotificationsState>()((set, get) => ({
  ...initialState,

  loadNotifications(params) {
    if (listRequest) return listRequest;
    const generation = ++listGeneration;
    const requestToken = Symbol("notification-list");
    listRequestToken = requestToken;
    const current = get();
    const query: NotificationQueryParams = {
      page: params?.page ?? current.pageMetadata?.page ?? 0,
      size: params?.size ?? current.pageMetadata?.size ?? 20,
      unreadOnly: params?.unreadOnly ?? current.filters.unreadOnly,
      type: params?.type ?? current.filters.type,
    };
    listRequest = (async () => {
      set({ status: "loading", error: null });
      try {
        const page = await notificationsService.getAll(query);
        if (generation === listGeneration) {
          set({
            notifications: page.content,
            pageMetadata: metadata(page),
            status: "loaded",
          });
        }
      } catch (error) {
        const mapped = apiError(error, "Notifications could not be loaded.");
        if (generation === listGeneration) {
          set({ status: "error", error: mapped });
        }
        throw mapped;
      } finally {
        if (listRequestToken === requestToken) {
          listRequest = null;
          listRequestToken = null;
        }
      }
    })();
    return listRequest;
  },

  loadSummary() {
    if (summaryRequest) return summaryRequest;
    const generation = summaryGeneration;
    const requestToken = Symbol("notification-summary");
    summaryRequestToken = requestToken;
    summaryRequest = (async () => {
      set({ summaryStatus: "loading", summaryError: null });
      try {
        const summary = await notificationsService.getSummary();
        if (generation === summaryGeneration) {
          set({ summary, summaryStatus: "loaded" });
        }
      } catch (error) {
        const mapped = apiError(error, "Unread notifications could not be loaded.");
        if (generation === summaryGeneration) {
          set({ summaryStatus: "error", summaryError: mapped });
        }
        throw mapped;
      } finally {
        if (summaryRequestToken === requestToken) {
          summaryRequest = null;
          summaryRequestToken = null;
        }
      }
    })();
    return summaryRequest;
  },

  setFilters(filters) {
    listGeneration += 1;
    listRequest = null;
    listRequestToken = null;
    set({ filters, pageMetadata: null, status: "idle", error: null });
  },

  async markRead(notificationId) {
    await mutate(notificationId, true, set, get);
  },

  async markUnread(notificationId) {
    await mutate(notificationId, false, set, get);
  },

  async markAllRead() {
    if (get().markAllStatus === "loading") return;
    const generation = mutationGeneration;
    set({ markAllStatus: "loading", markAllError: null });
    try {
      const summary = await notificationsService.markAllRead();
      const now = new Date().toISOString();
      if (generation !== mutationGeneration) return;
      set((state) => ({
        notifications: state.notifications.map((notification) => ({
          ...notification,
          read: true,
          readAt: notification.readAt ?? now,
        })),
        summary: { unreadCount: Math.max(0, summary.unreadCount) },
        summaryStatus: "loaded",
        markAllStatus: "loaded",
      }));
    } catch (error) {
      const mapped = apiError(error, "Notifications could not be marked read.");
      if (generation === mutationGeneration) {
        set({ markAllStatus: "error", markAllError: mapped });
      }
      throw mapped;
    }
  },

  refreshNotifications() {
    const state = get();
    listGeneration += 1;
    listRequest = null;
    listRequestToken = null;
    return state.loadNotifications({
      page: state.pageMetadata?.page ?? 0,
      size: state.pageMetadata?.size ?? 20,
      ...state.filters,
    });
  },

  clearNotifications() {
    listGeneration += 1;
    summaryGeneration += 1;
    mutationGeneration += 1;
    listRequest = null;
    listRequestToken = null;
    summaryRequest = null;
    summaryRequestToken = null;
    set(initialState);
  },

  clearErrors() {
    set({
      error: null,
      summaryError: null,
      mutationErrorById: {},
      markAllError: null,
    });
  },
}));

type Setter = (
  partial:
    | Partial<NotificationsState>
    | ((state: NotificationsState) => Partial<NotificationsState>),
) => void;

async function mutate(
  notificationId: string,
  read: boolean,
  set: Setter,
  get: () => NotificationsState,
): Promise<void> {
  if (get().mutationStatusById[notificationId] === "loading") return;
  const generation = mutationGeneration;
  const previous = get().notifications.find(({ id }) => id === notificationId);
  set((state) => ({
    mutationStatusById: {
      ...state.mutationStatusById,
      [notificationId]: "loading",
    },
    mutationErrorById: {
      ...state.mutationErrorById,
      [notificationId]: null,
    },
  }));
  try {
    const updated = read
      ? await notificationsService.markRead(notificationId)
      : await notificationsService.markUnread(notificationId);
    if (generation !== mutationGeneration) return;
    set((state) => {
      const changed = previous ? previous.read !== updated.read : false;
      const delta = changed ? (updated.read ? -1 : 1) : 0;
      return {
        notifications: state.notifications.map((notification) =>
          notification.id === notificationId ? updated : notification,
        ),
        summary: state.summary
          ? {
              unreadCount: Math.max(0, state.summary.unreadCount + delta),
            }
          : state.summary,
        mutationStatusById: {
          ...state.mutationStatusById,
          [notificationId]: "loaded",
        },
      };
    });
  } catch (error) {
    const mapped = apiError(error, "The notification could not be updated.");
    if (generation === mutationGeneration) {
      set((state) => ({
        mutationStatusById: {
          ...state.mutationStatusById,
          [notificationId]: "error",
        },
        mutationErrorById: {
          ...state.mutationErrorById,
          [notificationId]: mapped,
        },
      }));
    }
    throw mapped;
  }
}

notificationsStateCoordinator.configure((authenticated) => {
  useNotificationsStore.getState().clearNotifications();
  if (authenticated) {
    void useNotificationsStore.getState().loadSummary().catch(() => undefined);
  }
});
