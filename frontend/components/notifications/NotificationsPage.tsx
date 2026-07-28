"use client";

import Link from "next/link";
import { useEffect } from "react";

import AppShell from "@/components/layout/AppShell";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormError from "@/components/ui/FormError";
import Skeleton from "@/components/ui/Skeleton";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getNotificationErrorMessage } from "@/services/api/notificationErrorMessage";
import { useNotificationsStore } from "@/store/notifications.store";
import type {
  NotificationFilters,
  NotificationType,
} from "@/types/notifications";
import { formatUtcDate } from "@/utils/formatDate";
import { getNotificationHref } from "@/utils/getNotificationHref";
import { notificationTypeLabels } from "@/utils/notificationLabels";

const types = Object.keys(notificationTypeLabels) as NotificationType[];

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const notifications = useNotificationsStore((state) => state.notifications);
  const metadata = useNotificationsStore((state) => state.pageMetadata);
  const status = useNotificationsStore((state) => state.status);
  const error = useNotificationsStore((state) => state.error);
  const filters = useNotificationsStore((state) => state.filters);
  const summary = useNotificationsStore((state) => state.summary);
  const markAllStatus = useNotificationsStore((state) => state.markAllStatus);
  const markAllError = useNotificationsStore((state) => state.markAllError);
  const load = useNotificationsStore((state) => state.loadNotifications);
  const setFilters = useNotificationsStore((state) => state.setFilters);
  const markRead = useNotificationsStore((state) => state.markRead);
  const markUnread = useNotificationsStore((state) => state.markUnread);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);
  const mutationStatuses = useNotificationsStore(
    (state) => state.mutationStatusById,
  );
  const mutationErrors = useNotificationsStore(
    (state) => state.mutationErrorById,
  );

  useEffect(() => {
    if (user && status === "idle") {
      void load({ page: 0, size: 20 }).catch(() => undefined);
    }
  }, [load, status, user]);

  function updateFilters(next: NotificationFilters) {
    setFilters(next);
    void load({ page: 0, size: 20, ...next }).catch(() => undefined);
  }

  if (authLoading || !user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Skeleton aria-label="Loading notifications" className="h-96" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">
              Updates from your network and projects.
            </p>
          </div>
          {(summary?.unreadCount ?? 0) > 0 && (
            <Button
              variant="secondary"
              onClick={() => void markAllRead().catch(() => undefined)}
              isLoading={markAllStatus === "loading"}
              loadingText="Marking read…"
            >
              Mark all as read
            </Button>
          )}
        </div>

        <Card className="mb-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Read status
              <select
                value={filters.unreadOnly ? "unread" : "all"}
                onChange={(event) =>
                  updateFilters({
                    ...filters,
                    unreadOnly: event.target.value === "unread",
                  })
                }
                className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2"
              >
                <option value="all">All notifications</option>
                <option value="unread">Unread only</option>
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">
              Notification type
              <select
                value={filters.type ?? ""}
                onChange={(event) =>
                  updateFilters({
                    ...filters,
                    type: (event.target.value || undefined) as
                      | NotificationType
                      | undefined,
                  })
                }
                className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2"
              >
                <option value="">All types</option>
                {types.map((type) => (
                  <option key={type} value={type}>
                    {notificationTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        {markAllError && (
          <div className="mb-4" role="alert">
            <FormError message={getNotificationErrorMessage(markAllError)} />
          </div>
        )}
        {status === "loading" && (
          <div aria-live="polite" className="space-y-3">
            <span className="sr-only">Loading notifications…</span>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        )}
        {status === "error" && error && (
          <EmptyState
            title="Unable to load notifications"
            description={getNotificationErrorMessage(error)}
            action={
              <Button onClick={() => void load().catch(() => undefined)}>
                Try again
              </Button>
            }
          />
        )}
        {status === "loaded" && notifications.length === 0 && (
          <EmptyState
            title="No notifications"
            description={
              filters.unreadOnly || filters.type
                ? "No notifications match these filters."
                : "New activity will appear here."
            }
          />
        )}
        {status === "loaded" && notifications.length > 0 && (
          <ul className="space-y-3" aria-label="Notifications">
            {notifications.map((notification) => {
              const destination = getNotificationHref(notification);
              const pending =
                mutationStatuses[notification.id] === "loading";
              const mutationError = mutationErrors[notification.id];
              return (
                <li key={notification.id}>
                  <Card
                    as="article"
                    className={notification.read ? "" : "border-gray-400"}
                    aria-label={`${notificationTypeLabels[notification.type]}, ${notification.read ? "read" : "unread"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant={notification.read ? "neutral" : "dark"}>
                            {notificationTypeLabels[notification.type]}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {notification.read ? "Read" : "Unread"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {notification.actor ? (
                            <Link
                              href={`/users?username=${encodeURIComponent(notification.actor.username)}`}
                              className="font-medium hover:text-black"
                            >
                              {notification.actor.fullName}
                            </Link>
                          ) : (
                            "Deleted user"
                          )}
                          {notification.actor?.professionalTitle
                            ? ` · ${notification.actor.professionalTitle}`
                            : ""}
                        </p>
                        <time
                          dateTime={notification.createdAt}
                          className="mt-1 block text-xs text-gray-400"
                        >
                          {formatUtcDate(notification.createdAt)}
                        </time>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {destination && (
                          <Link
                            href={destination}
                            className="text-xs font-semibold text-gray-700 underline hover:text-black"
                          >
                            View
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            void (notification.read
                              ? markUnread(notification.id)
                              : markRead(notification.id)
                            ).catch(() => undefined)
                          }
                        >
                          {notification.read ? "Mark unread" : "Mark read"}
                        </Button>
                      </div>
                    </div>
                    {mutationError && (
                      <div className="mt-3" role="alert">
                        <FormError
                          message={getNotificationErrorMessage(mutationError)}
                        />
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        {metadata && (
          <nav
            aria-label="Notification pagination"
            className="mt-6 flex justify-between"
          >
            <Button
              variant="secondary"
              disabled={metadata.first || status === "loading"}
              onClick={() =>
                void load({ page: metadata.page - 1 }).catch(() => undefined)
              }
            >
              Previous
            </Button>
            <span className="self-center text-sm text-gray-500">
              Page {metadata.page + 1} of {Math.max(1, metadata.totalPages)}
            </span>
            <Button
              variant="secondary"
              disabled={metadata.last || status === "loading"}
              onClick={() =>
                void load({ page: metadata.page + 1 }).catch(() => undefined)
              }
            >
              Next
            </Button>
          </nav>
        )}
      </section>
    </AppShell>
  );
}
