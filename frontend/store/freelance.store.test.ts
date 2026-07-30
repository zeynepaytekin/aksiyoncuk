import { beforeEach, describe, expect, it, vi } from "vitest";
import { freelanceService } from "@/services/api/freelance.service";
import { freelanceStateCoordinator } from "@/services/freelance/freelanceStateCoordinator";
import { useFreelanceStore } from "@/store/freelance.store";
vi.mock("@/services/api/freelance.service", () => ({ freelanceService: {
  getCategories: vi.fn(), searchServices: vi.fn(), getService: vi.fn(), getMyServices: vi.fn(),
  createService: vi.fn(), updateService: vi.fn(), publishService: vi.fn(), pauseService: vi.fn(),
  archiveService: vi.fn(), createOrder: vi.fn(), getBuyingOrders: vi.fn(), getSellingOrders: vi.fn(),
  getOrder: vi.fn(), getServiceReviews: vi.fn(), createReview: vi.fn(),
} }));
const page = (title: string) => ({ content: [{ id: title, title }], page: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true });
describe("freelance store", () => {
  beforeEach(() => useFreelanceStore.setState({ services: null, selectedService: null, myServices: null, buyingOrders: null, sellingOrders: null, selectedOrder: null, searchStatus: "idle" }));
  it("protects search results from stale responses", async () => {
    let first!: (value: never) => void, second!: (value: never) => void;
    vi.mocked(freelanceService.searchServices)
      .mockReturnValueOnce(new Promise((resolve) => { first = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { second = resolve; }));
    const a = useFreelanceStore.getState().searchServices({ q: "old" });
    const b = useFreelanceStore.getState().searchServices({ q: "new" });
    second(page("new") as never); await b; first(page("old") as never); await a;
    expect(useFreelanceStore.getState().services?.content[0].title).toBe("new");
  });
  it("synchronizes authoritative order transitions", async () => {
    const order = { id: "order", status: "CREATED" } as never;
    const updated = { id: "order", status: "IN_PROGRESS" } as never;
    useFreelanceStore.setState({ selectedOrder: order, buyingOrders: { ...page("x"), content: [order] } as never });
    await useFreelanceStore.getState().runOrderAction("start:order", async () => updated);
    expect(useFreelanceStore.getState().selectedOrder?.status).toBe("IN_PROGRESS");
    expect(useFreelanceStore.getState().buyingOrders?.content[0].status).toBe("IN_PROGRESS");
  });
  it("uses the owned summary response without detail N+1 requests", async () => {
    const owned = {
      id: "owned", slug: "owned", title: "Owned", status: "PAUSED", thumbnailUrl: null,
      category: { id: "category", parentId: null, slug: "design", name: "Design", description: null, displayOrder: 1, children: [] },
      lowestPrice: 100, currencyCode: "TRY", averageRating: null, reviewCount: 0,
      orderCount: 0, updatedAt: "2026-01-01T00:00:00Z", publishedAt: null,
    } as const;
    vi.mocked(freelanceService.getMyServices).mockResolvedValue({
      ...page("owned"), content: [owned],
    } as never);
    await useFreelanceStore.getState().loadMyServices();
    expect(useFreelanceStore.getState().myServices?.content[0].status).toBe("PAUSED");
    expect(freelanceService.getService).not.toHaveBeenCalled();
  });
  it("clears private marketplace data on logout and has no persistence", () => {
    useFreelanceStore.setState({ selectedOrder: { id: "private" } as never, myServices: page("private") as never });
    freelanceStateCoordinator.authenticationChanged(false);
    expect(useFreelanceStore.getState().selectedOrder).toBeNull();
    expect(useFreelanceStore.getState().myServices).toBeNull();
    expect("persist" in useFreelanceStore).toBe(false);
  });
});
