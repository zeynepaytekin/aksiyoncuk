import type { Conversation } from "./messaging";

export type FreelanceServiceStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "ARCHIVED";
export type FreelancePackageTier = "BASIC" | "STANDARD" | "PREMIUM";
export type FreelanceSearchSort =
  | "NEWEST"
  | "PRICE_ASC"
  | "PRICE_DESC"
  | "RATING_DESC"
  | "DELIVERY_ASC"
  | "POPULAR";
export type FreelanceOrderStatus =
  | "CREATED"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "REVISION_REQUESTED"
  | "CANCELLATION_REQUESTED"
  | "COMPLETED"
  | "CANCELLED";
export type FreelanceCancellationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
export type FreelanceParticipantRole = "BUYER" | "SELLER";

export type FreelanceCategory = {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  description: string | null;
  displayOrder: number;
  children: FreelanceCategory[];
};
export type FreelanceCategoryTree = FreelanceCategory[];

export type FreelanceSellerSummary = {
  id: string;
  username: string;
  fullName: string | null;
  professionalTitle: string | null;
  avatarUrl: string | null;
};
export type FreelanceServicePackage = {
  id: string;
  tier: FreelancePackageTier;
  name: string;
  description: string;
  priceAmount: number;
  currencyCode: string;
  deliveryDays: number;
  revisionCount: number;
  active: boolean;
  displayOrder: number;
};
export type FreelanceServiceMedia = {
  id: string;
  url: string;
  contentType: string;
  sizeBytes: number | null;
  displayOrder: number;
};
export type FreelanceServiceWork = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  displayOrder: number;
};
export type FreelanceService = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  status: FreelanceServiceStatus;
  languageCode: string;
  category: FreelanceCategory;
  seller: FreelanceSellerSummary;
  packages: FreelanceServicePackage[];
  works: FreelanceServiceWork[];
  media: FreelanceServiceMedia[];
  averageRating: number | null;
  reviewCount: number;
  orderCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type FreelanceServiceSummary = Pick<
  FreelanceService,
  "id" | "slug" | "title" | "shortDescription" | "category" | "seller" | "averageRating" | "reviewCount" | "orderCount" | "publishedAt"
> & {
  thumbnailUrl: string | null;
  lowestPrice: number;
  currencyCode: string;
  shortestDeliveryDays: number | null;
};
export type FreelancePage<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};
export type FreelanceServicePage = FreelancePage<FreelanceServiceSummary>;
export type FreelanceOwnedServiceSummary = {
  id: string;
  slug: string;
  title: string;
  status: FreelanceServiceStatus;
  thumbnailUrl: string | null;
  category: FreelanceCategory;
  lowestPrice: number | null;
  currencyCode: string;
  averageRating: number | null;
  reviewCount: number;
  orderCount: number;
  updatedAt: string;
  publishedAt: string | null;
};
export type FreelanceOwnedServicePage = FreelancePage<FreelanceOwnedServiceSummary>;
export type FreelanceSearchFilters = {
  q?: string;
  category?: string;
  seller?: string;
  minPrice?: string;
  maxPrice?: string;
  deliveryDaysMax?: number;
  minimumRating?: string;
  packageTier?: FreelancePackageTier;
  page?: number;
  size?: number;
  sort?: FreelanceSearchSort;
};

export type FreelanceDeliveryAttachment = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  displayOrder: number;
  createdAt: string;
};
export type FreelanceDelivery = {
  id: string;
  message: string;
  createdAt: string;
  attachments: FreelanceDeliveryAttachment[];
};
export type FreelanceRevisionRequest = {
  id: string;
  reason: string;
  sequenceNumber: number;
  acknowledgedAt: string | null;
  createdAt: string;
};
export type FreelanceCancellationRequest = {
  id: string;
  requestedRole: FreelanceParticipantRole;
  reason: string;
  status: FreelanceCancellationStatus;
  previousOrderStatus: FreelanceOrderStatus;
  resolverRole: FreelanceParticipantRole | null;
  createdAt: string;
  resolvedAt: string | null;
};
export type FreelanceOrder = {
  id: string;
  orderNumber: string;
  serviceId: string;
  serviceTitle: string;
  buyer: FreelanceSellerSummary;
  seller: FreelanceSellerSummary;
  status: FreelanceOrderStatus;
  packageTier: FreelancePackageTier;
  packageName: string;
  packageDescription: string;
  priceAmount: number;
  currencyCode: string;
  deliveryDays: number;
  includedRevisionCount: number;
  usedRevisionCount: number;
  buyerRequirements: string;
  startedAt: string | null;
  deliveryDueAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  deliveries: FreelanceDelivery[];
  revisions: FreelanceRevisionRequest[];
  pendingCancellation: FreelanceCancellationRequest | null;
  cancellationHistory: FreelanceCancellationRequest[];
  reviewEligible: boolean;
  createdAt: string;
  updatedAt: string;
};
export type FreelanceOrderSummary = FreelanceOrder;
export type FreelanceOrderPage = FreelancePage<FreelanceOrder>;
export type FreelanceReview = {
  id: string;
  reviewer: FreelanceSellerSummary;
  rating: number;
  comment: string | null;
  createdAt: string;
};
export type FreelanceReviewPage = FreelancePage<FreelanceReview>;

export type FreelancePackageRequest = {
  tier: FreelancePackageTier;
  name: string;
  description: string;
  priceAmount: string;
  currencyCode: string;
  deliveryDays: number;
  revisionCount: number;
  active: boolean;
};
export type CreateFreelanceServiceRequest = {
  categoryId: string;
  title: string;
  shortDescription: string;
  description: string;
  languageCode: string;
  packages: FreelancePackageRequest[];
  workIds: string[];
};
export type UpdateFreelanceServiceRequest = CreateFreelanceServiceRequest;
export type ReorderFreelanceMediaRequest = { mediaIds: string[] };
export type UpdateFreelanceWorksRequest = { workIds: string[] };
export type CreateFreelanceOrderRequest = { serviceId: string; packageId: string; requirements: string };
export type FreelanceReasonRequest = { reason: string };
export type FreelanceDeliveryRequest = { message: string; files?: File[] };
export type CreateFreelanceReviewRequest = { rating: number; comment: string | null };
export type FreelanceOrderFilters = { status?: FreelanceOrderStatus; page?: number; size?: number };
export type FreelanceConversation = Conversation;
