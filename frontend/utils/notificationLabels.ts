import type { NotificationType } from "@/types/notifications";

export const notificationTypeLabels: Record<NotificationType, string> = {
  USER_FOLLOWED: "New follower",
  POST_LIKED: "Post liked",
  POST_COMMENTED: "New comment",
  JOB_APPLICATION_RECEIVED: "New job application",
  JOB_APPLICATION_ACCEPTED: "Application accepted",
  JOB_APPLICATION_REJECTED: "Application rejected",
  FREELANCE_ORDER_CREATED: "New freelance order",
  FREELANCE_ORDER_STARTED: "Freelance order started",
  FREELANCE_ORDER_REJECTED: "Freelance order rejected",
  FREELANCE_ORDER_DELIVERED: "Freelance order delivered",
  FREELANCE_REVISION_REQUESTED: "Revision requested",
  FREELANCE_REVISION_ACKNOWLEDGED: "Revision acknowledged",
  FREELANCE_ORDER_COMPLETED: "Freelance order completed",
  FREELANCE_CANCELLATION_REQUESTED: "Cancellation requested",
  FREELANCE_CANCELLATION_ACCEPTED: "Cancellation accepted",
  FREELANCE_CANCELLATION_REJECTED: "Cancellation rejected",
  FREELANCE_REVIEW_RECEIVED: "New freelance review",
};
