import type { Notification } from "@/types/notifications";

export function getNotificationHref(
  notification: Notification,
): string | null {
  if (
    notification.type === "USER_FOLLOWED" &&
    notification.actor?.username.trim()
  ) {
    return `/users?username=${encodeURIComponent(notification.actor.username)}`;
  }
  if (
    (notification.type === "POST_LIKED" ||
      notification.type === "POST_COMMENTED") &&
    notification.entityId
  ) {
    return `/posts/view?id=${encodeURIComponent(notification.entityId)}`;
  }
  if (
    (notification.type === "JOB_APPLICATION_RECEIVED" ||
      notification.type === "JOB_APPLICATION_ACCEPTED" ||
      notification.type === "JOB_APPLICATION_REJECTED") &&
    notification.entityId
  ) {
    return `/applications/view?id=${encodeURIComponent(notification.entityId)}`;
  }
  return null;
}
