import { apiRequest } from "./apiClient";
import type { MediaAsset, MediaListItem } from "@/types/media";
import type {
  CreateFreelanceOrderRequest, CreateFreelanceReviewRequest, CreateFreelanceServiceRequest,
  FreelanceCategory, FreelanceConversation, FreelanceDeliveryRequest, FreelanceOrder,
  FreelanceOrderFilters, FreelanceOrderPage, FreelanceReasonRequest, FreelanceReview,
  FreelanceReviewPage, FreelanceSearchFilters, FreelanceService, FreelanceServicePage,
  FreelanceOwnedServicePage,
  ReorderFreelanceMediaRequest, UpdateFreelanceServiceRequest,
} from "@/types/freelance";

const encoded = (value: string) => encodeURIComponent(value.trim());
function query(values: Record<string, string | number | undefined>): string {
  const result = new URLSearchParams(
    Object.entries(values)
      .filter((entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== "")
      .map(([key, value]) => [key, String(value)]),
  ).toString();
  return result ? `?${result}` : "";
}
function multipart(file: File): FormData {
  const body = new FormData();
  body.append("file", file);
  return body;
}
const servicePath = (value: string) => `/freelance/services/${encoded(value)}`;
const orderPath = (value: string) => `/freelance/orders/${encoded(value)}`;
const action = (path: string) => apiRequest<FreelanceOrder>(path, { method: "POST", authenticated: true });

export const freelanceService = {
  getCategories: () => apiRequest<FreelanceCategory[]>("/freelance/categories"),
  getCategoryBySlug: (slug: string) => apiRequest<FreelanceCategory>(`/freelance/categories/${encoded(slug)}`),
  searchServices: (filters: FreelanceSearchFilters = {}) =>
    apiRequest<FreelanceServicePage>(`/freelance/services${query(filters)}`),
  getService: (serviceId: string) => apiRequest<FreelanceService>(servicePath(serviceId), { authenticated: true }),
  getMyServices: (page = 0, size = 20) =>
    apiRequest<FreelanceOwnedServicePage>(`/freelance/services/mine${query({ page, size })}`, { authenticated: true }),
  createService: (body: CreateFreelanceServiceRequest) =>
    apiRequest<FreelanceService>("/freelance/services", { method: "POST", authenticated: true, body }),
  updateService: (serviceId: string, body: UpdateFreelanceServiceRequest) =>
    apiRequest<FreelanceService>(servicePath(serviceId), { method: "PUT", authenticated: true, body }),
  publishService: (serviceId: string) =>
    apiRequest<FreelanceService>(`${servicePath(serviceId)}/publish`, { method: "POST", authenticated: true }),
  pauseService: (serviceId: string) =>
    apiRequest<FreelanceService>(`${servicePath(serviceId)}/pause`, { method: "POST", authenticated: true }),
  archiveService: (serviceId: string) =>
    apiRequest<FreelanceService>(`${servicePath(serviceId)}/archive`, { method: "POST", authenticated: true }),
  uploadServiceImage: (serviceId: string, file: File) =>
    apiRequest<MediaAsset>(`${servicePath(serviceId)}/media`, {
      method: "POST", authenticated: true, body: multipart(file),
    }),
  deleteServiceImage: (serviceId: string, mediaId: string) =>
    apiRequest<void>(`${servicePath(serviceId)}/media/${encoded(mediaId)}`, { method: "DELETE", authenticated: true }),
  reorderServiceImages: (serviceId: string, mediaIds: string[]) =>
    apiRequest<MediaListItem[]>(`${servicePath(serviceId)}/media/order`, {
      method: "PUT", authenticated: true, body: { mediaIds } satisfies ReorderFreelanceMediaRequest,
    }),
  openServiceConversation: (serviceId: string) =>
    apiRequest<FreelanceConversation>(`${servicePath(serviceId)}/conversation`, { method: "POST", authenticated: true }),
  createOrder: (body: CreateFreelanceOrderRequest) =>
    apiRequest<FreelanceOrder>("/freelance/orders", { method: "POST", authenticated: true, body }),
  getOrder: (orderId: string) => apiRequest<FreelanceOrder>(orderPath(orderId), { authenticated: true }),
  getBuyingOrders: (filters: FreelanceOrderFilters = {}) =>
    apiRequest<FreelanceOrderPage>(`/freelance/orders/buying${query(filters)}`, { authenticated: true }),
  getSellingOrders: (filters: FreelanceOrderFilters = {}) =>
    apiRequest<FreelanceOrderPage>(`/freelance/orders/selling${query(filters)}`, { authenticated: true }),
  startOrder: (orderId: string) => action(`${orderPath(orderId)}/start`),
  rejectOrder: (orderId: string, body: FreelanceReasonRequest) =>
    apiRequest<FreelanceOrder>(`${orderPath(orderId)}/reject`, { method: "POST", authenticated: true, body }),
  deliverOrder: (orderId: string, body: FreelanceDeliveryRequest) =>
    apiRequest<FreelanceOrder>(`${orderPath(orderId)}/deliver`, { method: "POST", authenticated: true, body }),
  requestRevision: (orderId: string, body: FreelanceReasonRequest) =>
    apiRequest<FreelanceOrder>(`${orderPath(orderId)}/revisions`, { method: "POST", authenticated: true, body }),
  acknowledgeRevision: (orderId: string, revisionId: string) =>
    action(`${orderPath(orderId)}/revisions/${encoded(revisionId)}/acknowledge`),
  completeOrder: (orderId: string) => action(`${orderPath(orderId)}/complete`),
  requestCancellation: (orderId: string, body: FreelanceReasonRequest) =>
    apiRequest<FreelanceOrder>(`${orderPath(orderId)}/cancellation-requests`, {
      method: "POST", authenticated: true, body,
    }),
  acceptCancellation: (orderId: string, requestId: string) =>
    action(`${orderPath(orderId)}/cancellation-requests/${encoded(requestId)}/accept`),
  rejectCancellation: (orderId: string, requestId: string) =>
    action(`${orderPath(orderId)}/cancellation-requests/${encoded(requestId)}/reject`),
  withdrawCancellation: (orderId: string, requestId: string) =>
    action(`${orderPath(orderId)}/cancellation-requests/${encoded(requestId)}/withdraw`),
  createReview: (orderId: string, body: CreateFreelanceReviewRequest) =>
    apiRequest<FreelanceReview>(`${orderPath(orderId)}/review`, { method: "POST", authenticated: true, body }),
  getServiceReviews: (serviceId: string, page = 0, size = 20) =>
    apiRequest<FreelanceReviewPage>(`${servicePath(serviceId)}/reviews${query({ page, size })}`),
};
export type FreelanceServiceApi = typeof freelanceService;
