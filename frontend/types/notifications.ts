export type NotificationType =
  | "USER_FOLLOWED"
  | "POST_LIKED"
  | "POST_COMMENTED"
  | "JOB_APPLICATION_RECEIVED"
  | "JOB_APPLICATION_ACCEPTED"
  | "JOB_APPLICATION_REJECTED";

export type NotificationEntityType =
  | "USER"
  | "POST"
  | "JOB"
  | "JOB_APPLICATION";

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
