import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/services/api/apiClient";
import { notificationsService } from "@/services/api/notifications.service";
import { useNotificationsStore } from "@/store/notifications.store";
import type {
  Notification,
  NotificationPage,
} from "@/types/notifications";

vi.mock("@/services/api/notifications.service", () => ({
  notificationsService: {
    getAll: vi.fn(),
    getSummary: vi.fn(),
    markRead: vi.fn(),
    markUnread: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

const unread: Notification = {
  id: "notification-1",
  type: "POST_LIKED",
  entityType: "POST",
  entityId: "post-1",
  message: "Creative User liked your post.",
  read: false,
  readAt: null,
  createdAt: "2026-07-28T18:00:00Z",
  actor: {
    id: "actor",
    username: "creativeuser",
    fullName: "Creative User",
    professionalTitle: "Director",
  },
};
const page: NotificationPage = {
  content: [unread],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

describe("notifications store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationsStore.getState().clearNotifications();
  });

  it("loads a filtered page and records failures", async () => {
    vi.mocked(notificationsService.getAll).mockResolvedValue(page);
    useNotificationsStore
      .getState()
      .setFilters({ unreadOnly: true, type: "POST_LIKED" });
    await useNotificationsStore.getState().loadNotifications({ page: 0 });
    expect(useNotificationsStore.getState().notifications).toEqual([unread]);
    expect(useNotificationsStore.getState().pageMetadata?.totalElements).toBe(1);
    expect(notificationsService.getAll).toHaveBeenCalledWith({
      page: 0,
      size: 20,
      unreadOnly: true,
      type: "POST_LIKED",
    });

    useNotificationsStore.getState().clearNotifications();
    vi.mocked(notificationsService.getAll).mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "offline"),
    );
    await expect(
      useNotificationsStore.getState().loadNotifications(),
    ).rejects.toBeInstanceOf(ApiError);
    expect(useNotificationsStore.getState().status).toBe("error");
  });

  it("deduplicates overlapping list and summary requests", async () => {
    let resolveList!: (value: NotificationPage) => void;
    let resolveSummary!: (value: { unreadCount: number }) => void;
    vi.mocked(notificationsService.getAll).mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );
    vi.mocked(notificationsService.getSummary).mockReturnValue(
      new Promise((resolve) => {
        resolveSummary = resolve;
      }),
    );
    const firstList = useNotificationsStore.getState().loadNotifications();
    const secondList = useNotificationsStore.getState().loadNotifications();
    const firstSummary = useNotificationsStore.getState().loadSummary();
    const secondSummary = useNotificationsStore.getState().loadSummary();
    expect(notificationsService.getAll).toHaveBeenCalledTimes(1);
    expect(notificationsService.getSummary).toHaveBeenCalledTimes(1);
    resolveList(page);
    resolveSummary({ unreadCount: 1 });
    await Promise.all([firstList, secondList, firstSummary, secondSummary]);
  });

  it("loads summary success and failure", async () => {
    vi.mocked(notificationsService.getSummary).mockResolvedValue({
      unreadCount: 8,
    });
    await useNotificationsStore.getState().loadSummary();
    expect(useNotificationsStore.getState().summary?.unreadCount).toBe(8);

    useNotificationsStore.getState().clearNotifications();
    vi.mocked(notificationsService.getSummary).mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "offline"),
    );
    await expect(
      useNotificationsStore.getState().loadSummary(),
    ).rejects.toBeInstanceOf(ApiError);
    expect(useNotificationsStore.getState().summaryStatus).toBe("error");
  });

  it("settles read and unread from the backend and clamps the count", async () => {
    useNotificationsStore.setState({
      notifications: [unread],
      summary: { unreadCount: 1 },
    });
    const read = { ...unread, read: true, readAt: "2026-07-28T19:00:00Z" };
    vi.mocked(notificationsService.markRead).mockResolvedValue(read);
    await useNotificationsStore.getState().markRead(unread.id);
    expect(useNotificationsStore.getState().notifications[0].read).toBe(true);
    expect(useNotificationsStore.getState().summary?.unreadCount).toBe(0);

    vi.mocked(notificationsService.markRead).mockResolvedValue(read);
    await useNotificationsStore.getState().markRead(unread.id);
    expect(useNotificationsStore.getState().summary?.unreadCount).toBe(0);

    vi.mocked(notificationsService.markUnread).mockResolvedValue(unread);
    await useNotificationsStore.getState().markUnread(unread.id);
    expect(useNotificationsStore.getState().summary?.unreadCount).toBe(1);
  });

  it("bulk read updates loaded items and cleanup removes all private state", async () => {
    useNotificationsStore.setState({
      notifications: [unread],
      summary: { unreadCount: 1 },
      mutationErrorById: {
        [unread.id]: new ApiError(500, "ERROR", "failure"),
      },
    });
    vi.mocked(notificationsService.markAllRead).mockResolvedValue({
      unreadCount: 0,
    });
    await useNotificationsStore.getState().markAllRead();
    expect(useNotificationsStore.getState().notifications[0].read).toBe(true);
    expect(useNotificationsStore.getState().summary?.unreadCount).toBe(0);
    useNotificationsStore.getState().clearNotifications();
    expect(useNotificationsStore.getState().notifications).toEqual([]);
    expect(useNotificationsStore.getState().summary).toBeNull();
    expect(useNotificationsStore.getState().filters).toEqual({});
    expect(useNotificationsStore.getState().mutationErrorById).toEqual({});
  });
});
