import type { NotificationType } from "@/types/notifications";

export const notificationTypeLabels: Record<NotificationType, string> = {
  USER_FOLLOWED: "New follower",
  POST_LIKED: "Post liked",
  POST_COMMENTED: "New comment",
  JOB_APPLICATION_RECEIVED: "New job application",
  JOB_APPLICATION_ACCEPTED: "Application accepted",
  JOB_APPLICATION_REJECTED: "Application rejected",
};
