import { apiRequest } from "@/services/api/apiClient";
import type {
  Notification,
  NotificationPage,
  NotificationQueryParams,
  NotificationSummary,
} from "@/types/notifications";

function query(params?: NotificationQueryParams): string {
  const values = new URLSearchParams();
  if (params?.page !== undefined) values.set("page", String(params.page));
  if (params?.size !== undefined) values.set("size", String(params.size));
  if (params?.unreadOnly !== undefined) {
    values.set("unreadOnly", String(params.unreadOnly));
  }
  if (params?.type !== undefined) values.set("type", params.type);
  const serialized = values.toString();
  return serialized ? `?${serialized}` : "";
}

export const notificationsService = {
  getAll(params?: NotificationQueryParams): Promise<NotificationPage> {
    return apiRequest<NotificationPage>(`/notifications${query(params)}`, {
      authenticated: true,
    });
  },

  getSummary(): Promise<NotificationSummary> {
    return apiRequest<NotificationSummary>("/notifications/summary", {
      authenticated: true,
    });
  },

  markRead(notificationId: string): Promise<Notification> {
    return apiRequest<Notification>(
      `/notifications/${encodeURIComponent(notificationId)}/read`,
      { method: "POST", authenticated: true },
    );
  },

  markUnread(notificationId: string): Promise<Notification> {
    return apiRequest<Notification>(
      `/notifications/${encodeURIComponent(notificationId)}/unread`,
      { method: "POST", authenticated: true },
    );
  },

  markAllRead(): Promise<NotificationSummary> {
    return apiRequest<NotificationSummary>("/notifications/read-all", {
      method: "POST",
      authenticated: true,
    });
  },
};
