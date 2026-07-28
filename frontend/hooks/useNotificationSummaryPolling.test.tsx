import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  NOTIFICATION_POLL_INTERVAL_MS,
  useNotificationSummaryPolling,
} from "@/hooks/useNotificationSummaryPolling";
import { notificationsService } from "@/services/api/notifications.service";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationsStore } from "@/store/notifications.store";

vi.mock("@/services/api/notifications.service", () => ({
  notificationsService: {
    getAll: vi.fn(),
    getSummary: vi.fn(),
    markRead: vi.fn(),
    markUnread: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

describe("notification summary polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useNotificationsStore.getState().clearNotifications();
    useAuthStore.setState({
      user: {
        id: "user",
        email: "user@example.com",
        username: "user",
        fullName: "User",
        status: "ACTIVE",
      },
      isInitialized: true,
      isLoading: false,
      status: "authenticated",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls only the summary and avoids overlapping requests", async () => {
    let resolve!: (value: { unreadCount: number }) => void;
    vi.mocked(notificationsService.getSummary).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { unmount } = renderHook(() => useNotificationSummaryPolling());
    expect(notificationsService.getSummary).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(NOTIFICATION_POLL_INTERVAL_MS * 2);
    expect(notificationsService.getSummary).toHaveBeenCalledTimes(1);
    expect(notificationsService.getAll).not.toHaveBeenCalled();
    resolve({ unreadCount: 2 });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(NOTIFICATION_POLL_INTERVAL_MS);
    expect(notificationsService.getSummary).toHaveBeenCalledTimes(2);
    unmount();
  });
});
