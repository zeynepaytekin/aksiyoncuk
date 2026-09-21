"use client";

import { create } from "zustand";
import { ApiError } from "@/services/api/apiClient";
import { freelanceService } from "@/services/api/freelance.service";
import { freelanceStateCoordinator } from "@/services/freelance/freelanceStateCoordinator";
import type {
  CreateFreelanceOrderRequest, CreateFreelanceReviewRequest, CreateFreelanceServiceRequest,
  FreelanceCategory, FreelanceOrder, FreelanceOrderFilters, FreelanceOrderPage, FreelanceReviewPage,
  FreelanceSearchFilters, FreelanceService, FreelanceServicePage, FreelanceOwnedServicePage, UpdateFreelanceServiceRequest,
} from "@/types/freelance";

type Status = "idle" | "loading" | "loaded" | "error";
type Mutation = Record<string, Status>;
type State = {
  categories: FreelanceCategory[]; categoriesStatus: Status; categoriesError: ApiError | null;
  services: FreelanceServicePage | null; filters: FreelanceSearchFilters; searchStatus: Status; searchError: ApiError | null;
  selectedService: FreelanceService | null; serviceStatus: Status; serviceError: ApiError | null;
  savedServices: FreelanceServicePage | null; savedStatus: Status; savedError: ApiError | null;
  myServices: FreelanceOwnedServicePage | null; myServicesStatus: Status; myServicesError: ApiError | null;
  buyingOrders: FreelanceOrderPage | null; sellingOrders: FreelanceOrderPage | null;
  buyingStatus: Status; sellingStatus: Status; ordersError: ApiError | null;
  selectedOrder: FreelanceOrder | null; orderStatus: Status; orderError: ApiError | null;
  reviews: FreelanceReviewPage | null; reviewsStatus: Status; reviewsError: ApiError | null;
  mutations: Mutation; mutationErrors: Record<string, ApiError | null>;
  loadCategories(): Promise<void>; searchServices(filters?: FreelanceSearchFilters): Promise<void>;
  loadService(id: string): Promise<void>; loadMyServices(page?: number): Promise<void>;
  loadSavedServices(page?: number): Promise<void>; setServiceSaved(id: string, saved: boolean): Promise<void>;
  createService(body: CreateFreelanceServiceRequest): Promise<FreelanceService>;
  updateService(id: string, body: UpdateFreelanceServiceRequest): Promise<FreelanceService>;
  publishService(id: string): Promise<FreelanceService>; pauseService(id: string): Promise<FreelanceService>;
  archiveService(id: string): Promise<FreelanceService>; createOrder(body: CreateFreelanceOrderRequest): Promise<FreelanceOrder>;
  loadBuyingOrders(filters?: FreelanceOrderFilters): Promise<void>; loadSellingOrders(filters?: FreelanceOrderFilters): Promise<void>;
  loadOrder(id: string): Promise<void>; runOrderAction(key: string, request: () => Promise<FreelanceOrder>): Promise<FreelanceOrder>;
  loadReviews(id: string, page?: number): Promise<void>;
  createReview(orderId: string, body: CreateFreelanceReviewRequest): Promise<void>; clearOnLogout(): void;
};
const errorOf = (error: unknown) => error instanceof ApiError ? error : new ApiError(0, "NETWORK_ERROR", "Request failed.");
let searchSequence = 0, serviceSequence = 0, orderSequence = 0;
let categoryRequest: Promise<void> | null = null;
const replaceSummary = (page: FreelanceServicePage | null, service: FreelanceService) =>
  page ? { ...page, content: page.content.map((item) => item.id === service.id ? {
    ...item, title: service.title, shortDescription: service.shortDescription, category: service.category,
    seller: service.seller, averageRating: service.averageRating, reviewCount: service.reviewCount,
    orderCount: service.orderCount, publishedAt: service.publishedAt,
  } : item) } : page;
const replaceOrder = (page: FreelanceOrderPage | null, order: FreelanceOrder) =>
  page ? { ...page, content: page.content.map((item) => item.id === order.id ? order : item) } : page;

export const useFreelanceStore = create<State>()((set, get) => ({
  categories: [], categoriesStatus: "idle", categoriesError: null, services: null, filters: {},
  searchStatus: "idle", searchError: null, selectedService: null, serviceStatus: "idle", serviceError: null,
  savedServices: null, savedStatus: "idle", savedError: null,
  myServices: null, myServicesStatus: "idle", myServicesError: null, buyingOrders: null, sellingOrders: null,
  buyingStatus: "idle", sellingStatus: "idle", ordersError: null, selectedOrder: null, orderStatus: "idle",
  orderError: null, reviews: null, reviewsStatus: "idle", reviewsError: null, mutations: {}, mutationErrors: {},
  loadCategories() {
    if (categoryRequest) return categoryRequest;
    categoryRequest = (async () => {
      set({ categoriesStatus: "loading", categoriesError: null });
      try { set({ categories: await freelanceService.getCategories(), categoriesStatus: "loaded" }); }
      catch (e) { const error = errorOf(e); set({ categoriesStatus: "error", categoriesError: error }); throw error; }
      finally { categoryRequest = null; }
    })(); return categoryRequest;
  },
  async searchServices(filters = get().filters) {
    const sequence = ++searchSequence; set({ filters, searchStatus: "loading", searchError: null });
    try { const services = await freelanceService.searchServices(filters); if (sequence === searchSequence) set({ services, searchStatus: "loaded" }); }
    catch (e) { const error = errorOf(e); if (sequence === searchSequence) set({ searchStatus: "error", searchError: error }); throw error; }
  },
  async loadService(id) {
    const sequence = ++serviceSequence; set({ serviceStatus: "loading", serviceError: null });
    try { const selectedService = await freelanceService.getService(id); if (sequence === serviceSequence) set({ selectedService, serviceStatus: "loaded" }); }
    catch (e) { const error = errorOf(e); if (sequence === serviceSequence) set({ serviceStatus: "error", serviceError: error }); throw error; }
  },
  async loadSavedServices(page = 0) {
    set({ savedStatus: "loading", savedError: null });
    try { set({ savedServices: await freelanceService.getSavedServices(page), savedStatus: "loaded" }); }
    catch (e) { const error = errorOf(e); set({ savedStatus: "error", savedError: error }); throw error; }
  },
  async setServiceSaved(id, saved) {
    const key = `saved:${id}`;
    if (get().mutations[key] === "loading") return;
    await mutate(
      key,
      () => saved ? freelanceService.saveService(id) : freelanceService.unsaveService(id),
      set,
      (result) => set((state) => ({
        services: updateSaved(state.services, id, result.saved),
        savedServices: result.saved
          ? updateSaved(state.savedServices, id, true)
          : removeSaved(state.savedServices, id),
        selectedService: state.selectedService?.id === id
          ? { ...state.selectedService, isSaved: result.saved }
          : state.selectedService,
      })),
    );
  },
  async loadMyServices(page = 0) {
    set({ myServicesStatus: "loading", myServicesError: null });
    try {
      set({ myServices: await freelanceService.getMyServices(page), myServicesStatus: "loaded" });
    }
    catch (e) { const error = errorOf(e); set({ myServicesStatus: "error", myServicesError: error }); throw error; }
  },
  async createService(body) {
    return mutate("create", () => freelanceService.createService(body), set, (service) =>
      set({ selectedService: service }));
  },
  async updateService(id, body) { return mutate(`update:${id}`, () => freelanceService.updateService(id, body), set, syncService); },
  async publishService(id) { return mutate(`publish:${id}`, () => freelanceService.publishService(id), set, syncService); },
  async pauseService(id) { return mutate(`pause:${id}`, () => freelanceService.pauseService(id), set, syncService); },
  async archiveService(id) { return mutate(`archive:${id}`, () => freelanceService.archiveService(id), set, syncService); },
  async createOrder(body) {
    return mutate("createOrder", () => freelanceService.createOrder(body), set, (order) => set({ selectedOrder: order }));
  },
  async loadBuyingOrders(filters) {
    set({ buyingStatus: "loading", ordersError: null });
    try { set({ buyingOrders: await freelanceService.getBuyingOrders(filters), buyingStatus: "loaded" }); }
    catch (e) { const error = errorOf(e); set({ buyingStatus: "error", ordersError: error }); throw error; }
  },
  async loadSellingOrders(filters) {
    set({ sellingStatus: "loading", ordersError: null });
    try { set({ sellingOrders: await freelanceService.getSellingOrders(filters), sellingStatus: "loaded" }); }
    catch (e) { const error = errorOf(e); set({ sellingStatus: "error", ordersError: error }); throw error; }
  },
  async loadOrder(id) {
    const sequence = ++orderSequence; set({ orderStatus: "loading", orderError: null });
    try { const selectedOrder = await freelanceService.getOrder(id); if (sequence === orderSequence) set({ selectedOrder, orderStatus: "loaded" }); }
    catch (e) { const error = errorOf(e); if (sequence === orderSequence) set({ orderStatus: "error", orderError: error }); throw error; }
  },
  runOrderAction(key, request) {
    return mutate(key, request, set, (order) => set((s) => ({
      selectedOrder: order, buyingOrders: replaceOrder(s.buyingOrders, order), sellingOrders: replaceOrder(s.sellingOrders, order),
    })));
  },
  async loadReviews(id, page = 0) {
    set({ reviewsStatus: "loading", reviewsError: null });
    try { set({ reviews: await freelanceService.getServiceReviews(id, page), reviewsStatus: "loaded" }); }
    catch (e) { const error = errorOf(e); set({ reviewsStatus: "error", reviewsError: error }); throw error; }
  },
  async createReview(orderId, body) {
    await mutate(`review:${orderId}`, () => freelanceService.createReview(orderId, body), set, () => undefined);
    const serviceId = get().selectedOrder?.serviceId; if (serviceId) await get().loadReviews(serviceId);
    await get().loadOrder(orderId);
  },
  clearOnLogout() {
    serviceSequence++; orderSequence++; set((state) => ({ selectedService: null, savedServices: null, myServices: null, buyingOrders: null,
      sellingOrders: null, selectedOrder: null, myServicesStatus: "idle", buyingStatus: "idle", sellingStatus: "idle",
      services: state.services ? { ...state.services, content: state.services.content.map((item) => ({ ...item, isSaved: false })) } : null,
      savedStatus: "idle", orderStatus: "idle", mutations: {}, mutationErrors: {} }));
  },
}));
function syncService(service: FreelanceService) {
  useFreelanceStore.setState((s) => ({
    selectedService: s.selectedService?.id === service.id ? service : s.selectedService,
    services: service.status === "PUBLISHED" ? replaceSummary(s.services, service) :
      s.services ? { ...s.services, content: s.services.content.filter((item) => item.id !== service.id) } : null,
    myServices: s.myServices ? { ...s.myServices, content: s.myServices.content.map((item) =>
      item.id === service.id ? {
        ...item,
        slug: service.slug,
        title: service.title,
        status: service.status,
        category: service.category,
        averageRating: service.averageRating,
        reviewCount: service.reviewCount,
        orderCount: service.orderCount,
        updatedAt: service.updatedAt,
        publishedAt: service.publishedAt,
      } : item) } : null,
  }));
}
const updateSaved = (page: FreelanceServicePage | null, id: string, saved: boolean) =>
  page ? { ...page, content: page.content.map((item) => item.id === id ? { ...item, isSaved: saved } : item) } : page;
const removeSaved = (page: FreelanceServicePage | null, id: string) => {
  if (!page || !page.content.some((item) => item.id === id)) return page;
  const totalElements = Math.max(0, page.totalElements - 1);
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / page.size);
  return {
    ...page,
    content: page.content.filter((item) => item.id !== id),
    totalElements,
    totalPages,
    last: page.page + 1 >= totalPages,
  };
};
async function mutate<T>(key: string, request: () => Promise<T>, set: (value: Partial<State> | ((s: State) => Partial<State>)) => void, sync: (value: T) => void): Promise<T> {
  set((s) => ({ mutations: { ...s.mutations, [key]: "loading" }, mutationErrors: { ...s.mutationErrors, [key]: null } }));
  try { const value = await request(); sync(value); set((s) => ({ mutations: { ...s.mutations, [key]: "loaded" } })); return value; }
  catch (e) { const error = errorOf(e); set((s) => ({ mutations: { ...s.mutations, [key]: "error" }, mutationErrors: { ...s.mutationErrors, [key]: error } })); throw error; }
}
freelanceStateCoordinator.configure((authenticated) => { if (!authenticated) useFreelanceStore.getState().clearOnLogout(); });
