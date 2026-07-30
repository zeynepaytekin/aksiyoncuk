import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Navbar from "@/components/layout/Navbar";
import NotificationsPage from "@/components/notifications/NotificationsPage";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationsStore } from "@/store/notifications.store";
import type { Notification } from "@/types/notifications";
import { getNotificationHref } from "@/utils/getNotificationHref";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const notification: Notification = {
  id: "notice",
  type: "POST_LIKED",
  entityType: "POST",
  entityId: "post/id",
  message: "Creative User liked your post.",
  read: false,
  readAt: null,
  createdAt: "2026-07-28T18:00:00Z",
  actor: {
    id: "actor",
    username: "creative/user",
    fullName: "Creative User",
    professionalTitle: "Director",
  },
};

describe("notifications UI", () => {
  beforeEach(() => {
    useNotificationsStore.getState().clearNotifications();
    useAuthStore.setState({
      user: null,
      isInitialized: true,
      isLoading: false,
      status: "unauthenticated",
    });
  });

  it("hides the bell when logged out and caps authenticated badges", () => {
    const { rerender } = render(<Navbar />);
    expect(
      screen.queryByRole("link", { name: /Notifications,/ }),
    ).not.toBeInTheDocument();
    useAuthStore.setState({
      user: {
        id: "user",
        email: "user@example.com",
        username: "user",
        fullName: "User",
        status: "ACTIVE",
      },
      status: "authenticated",
    });
    useNotificationsStore.setState({
      summary: { unreadCount: 120 },
      summaryStatus: "loaded",
    });
    rerender(<Navbar />);
    expect(
      screen.getByRole("link", { name: "Notifications, 120 unread" }),
    ).toBeInTheDocument();
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("renders notifications, actor links, destination links, and read controls", async () => {
    useAuthStore.setState({
      user: {
        id: "user",
        email: "user@example.com",
        username: "user",
        fullName: "User",
        status: "ACTIVE",
      },
      status: "authenticated",
    });
    const markRead = vi.fn().mockResolvedValue(undefined);
    useNotificationsStore.setState({
      notifications: [notification],
      pageMetadata: {
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
      },
      status: "loaded",
      summary: { unreadCount: 1 },
      markRead,
    });
    render(<NotificationsPage />);
    expect(screen.getByText(notification.message)).toBeInTheDocument();
    expect(screen.getAllByText("Post liked")).toHaveLength(2);
    expect(screen.getByRole("article")).toHaveAccessibleName(
      "Post liked, unread",
    );
    expect(screen.getByRole("link", { name: "Creative User" })).toHaveAttribute(
      "href",
      "/users?username=creative%2Fuser",
    );
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/posts/view?id=post%2Fid",
    );
    fireEvent.click(screen.getByRole("button", { name: "Mark read" }));
    await waitFor(() => expect(markRead).toHaveBeenCalledWith("notice"));
  });

  it("renders deleted actors, filters, empty state, and mark all", async () => {
    useAuthStore.setState({
      user: {
        id: "user",
        email: "user@example.com",
        username: "user",
        fullName: "User",
        status: "ACTIVE",
      },
      status: "authenticated",
    });
    const setFilters = vi.fn();
    const loadNotifications = vi.fn().mockResolvedValue(undefined);
    const markAllRead = vi.fn().mockResolvedValue(undefined);
    useNotificationsStore.setState({
      notifications: [{ ...notification, actor: null }],
      status: "loaded",
      summary: { unreadCount: 1 },
      setFilters,
      loadNotifications,
      markAllRead,
    });
    render(<NotificationsPage />);
    expect(screen.getByText("Deleted user")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Read status"), {
      target: { value: "unread" },
    });
    expect(setFilters).toHaveBeenCalledWith({ unreadOnly: true });
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    await waitFor(() => expect(markAllRead).toHaveBeenCalled());
  });

  it("shows accessible loading and empty states", () => {
    useAuthStore.setState({
      user: {
        id: "user",
        email: "user@example.com",
        username: "user",
        fullName: "User",
        status: "ACTIVE",
      },
      status: "authenticated",
    });
    useNotificationsStore.setState({ status: "loading" });
    const { rerender } = render(<NotificationsPage />);
    expect(screen.getByText("Loading notifications…")).toBeInTheDocument();
    useNotificationsStore.setState({ status: "loaded", notifications: [] });
    rerender(<NotificationsPage />);
    expect(screen.getByText("No notifications")).toBeInTheDocument();
  });

  it("maps safe destinations and rejects incomplete notifications", () => {
    expect(getNotificationHref(notification)).toBe("/posts/view?id=post%2Fid");
    expect(
      getNotificationHref({
        ...notification,
        type: "JOB_APPLICATION_RECEIVED",
        entityType: "JOB_APPLICATION",
        entityId: "application/id",
      }),
    ).toBe("/applications/view?id=application%2Fid");
    expect(
      getNotificationHref({
        ...notification,
        type: "USER_FOLLOWED",
        actor: null,
        entityId: null,
      }),
    ).toBeNull();
    expect(
      getNotificationHref({
        ...notification,
        type: "FREELANCE_ORDER_DELIVERED",
        entityType: "FREELANCE_ORDER",
        entityId: "order/id",
      }),
    ).toBe("/freelance/order?order=order%2Fid");
    expect(
      getNotificationHref({
        ...notification,
        type: "FREELANCE_REVIEW_RECEIVED",
        entityType: "FREELANCE_SERVICE",
        entityId: "service/id",
      }),
    ).toBe("/freelance/service?service=service%2Fid");
    expect(
      getNotificationHref({
        ...notification,
        type: "FREELANCE_ORDER_STARTED",
        entityType: null,
        entityId: "order/id",
      }),
    ).toBeNull();
  });
});
