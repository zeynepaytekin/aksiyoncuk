export type NotificationType =
  | "USER_FOLLOWED"
  | "POST_LIKED"
  | "POST_COMMENTED"
  | "JOB_APPLICATION_RECEIVED"
  | "JOB_APPLICATION_ACCEPTED"
  | "JOB_APPLICATION_REJECTED"
  | "FREELANCE_ORDER_CREATED"
  | "FREELANCE_ORDER_STARTED"
  | "FREELANCE_ORDER_REJECTED"
  | "FREELANCE_ORDER_DELIVERED"
  | "FREELANCE_REVISION_REQUESTED"
  | "FREELANCE_REVISION_ACKNOWLEDGED"
  | "FREELANCE_ORDER_COMPLETED"
  | "FREELANCE_CANCELLATION_REQUESTED"
  | "FREELANCE_CANCELLATION_ACCEPTED"
  | "FREELANCE_CANCELLATION_REJECTED"
  | "FREELANCE_REVIEW_RECEIVED";

export type NotificationEntityType =
  | "USER"
  | "POST"
  | "JOB"
  | "JOB_APPLICATION"
  | "FREELANCE_SERVICE"
  | "FREELANCE_ORDER";

export type NotificationActor = {
  id: string;
  username: string;
  fullName: string;
  professionalTitle: string | null;
};

export type Notification = {
  id: string;
  type: NotificationType;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  message: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  actor: NotificationActor | null;
};

export type NotificationPage = {
  content: Notification[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type NotificationPageMetadata = Omit<NotificationPage, "content">;

export type NotificationSummary = {
  unreadCount: number;
};

export type NotificationPaginationParams = {
  page?: number;
  size?: number;
};

export type NotificationFilters = {
  unreadOnly?: boolean;
  type?: NotificationType;
};

export type NotificationQueryParams = NotificationPaginationParams &
  NotificationFilters;
