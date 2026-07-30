import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiDownload, apiRequest } from "@/services/api/apiClient";
import { freelanceService } from "@/services/api/freelance.service";
vi.mock("@/services/api/apiClient", async (original) => ({
  ...(await original<typeof import("@/services/api/apiClient")>()), apiRequest: vi.fn(), apiDownload: vi.fn(),
}));
const request = vi.mocked(apiRequest);
const download = vi.mocked(apiDownload);
describe("freelanceService", () => {
  beforeEach(() => request.mockReset().mockResolvedValue({}));
  it("uses exact category and safely encoded service paths", async () => {
    await freelanceService.getCategoryBySlug("design/branding");
    expect(request).toHaveBeenLastCalledWith("/freelance/categories/design%2Fbranding");
    await freelanceService.publishService("service/id");
    expect(request).toHaveBeenLastCalledWith("/freelance/services/service%2Fid/publish", { method: "POST", authenticated: true });
  });
  it("encodes actual search parameters and omits undefined filters", async () => {
    await freelanceService.searchServices({ q: "logo & brand", category: undefined, minPrice: "10.50", page: 2, sort: "PRICE_ASC" });
    expect(request).toHaveBeenLastCalledWith("/freelance/services?q=logo+%26+brand&minPrice=10.50&page=2&sort=PRICE_ASC");
  });
  it("uploads the multipart field without a manual content type", async () => {
    const file = new File(["image"], "work.webp", { type: "image/webp" });
    await freelanceService.uploadServiceImage("service", file);
    const [, options] = request.mock.calls.at(-1)!;
    expect(options?.body).toBeInstanceOf(FormData);
    expect((options?.body as FormData).get("file")).toBe(file);
    expect(options?.headers).toBeUndefined();
  });
  it("creates orders with identifiers and requirements only", async () => {
    const body = { serviceId: "service", packageId: "package", requirements: "Brief" };
    await freelanceService.createOrder(body);
    expect(request).toHaveBeenLastCalledWith("/freelance/orders", { method: "POST", authenticated: true, body });
    expect(JSON.stringify(body)).not.toMatch(/price|seller|buyer/i);
  });
  it("delivers JSON and repeated files as multipart without a manual boundary", async () => {
    const first = new File(["a"], "a.txt", { type: "text/plain" });
    const second = new File(["b"], "b.txt", { type: "text/plain" });
    await freelanceService.deliverOrder("order/id", { message: "Delivery message", files: [first, second] });
    const [path, options] = request.mock.calls.at(-1)!;
    expect(path).toBe("/freelance/orders/order%2Fid/deliver");
    const form = options?.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.getAll("files")).toEqual([first, second]);
    expect((form.get("request") as Blob).type).toBe("application/json");
    expect(options?.headers).toBeUndefined();
  });
  it("downloads through the authenticated backend endpoint", async () => {
    download.mockResolvedValueOnce({ blob: new Blob(["x"]), contentDisposition: null });
    await freelanceService.downloadDeliveryAttachment("order", "delivery", "attachment");
    expect(download).toHaveBeenCalledWith(
      "/freelance/orders/order/deliveries/delivery/attachments/attachment/download",
      { authenticated: true },
    );
  });
  it("maps revision and cancellation actions and preserves ApiError", async () => {
    await freelanceService.acknowledgeRevision("order/a", "revision/a");
    expect(request).toHaveBeenLastCalledWith("/freelance/orders/order%2Fa/revisions/revision%2Fa/acknowledge", { method: "POST", authenticated: true });
    const error = new ApiError(409, "FREELANCE_ORDER_STATE_CONFLICT", "Stale");
    request.mockRejectedValueOnce(error);
    await expect(freelanceService.completeOrder("order")).rejects.toBe(error);
  });
});
