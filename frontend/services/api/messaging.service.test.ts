import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/services/api/apiClient";
import { messagingService } from "@/services/api/messaging.service";

vi.mock("@/services/api/apiClient", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/services/api/apiClient")>();
  return { ...original, apiRequest: vi.fn() };
});
const request = vi.mocked(apiRequest);

describe("messaging service", () => {
  beforeEach(() => request.mockReset());
  it("trims inputs and safely encodes conversation IDs", async () => {
    request.mockResolvedValue({});
    await messagingService.startConversation("  artist  ");
    await messagingService.sendMessage("id/slash", "  hello  ");
    expect(request).toHaveBeenNthCalledWith(1, "/conversations", {
      method: "POST", authenticated: true, body: { username: "artist" },
    });
    expect(request).toHaveBeenNthCalledWith(2, "/conversations/id%2Fslash/messages", {
      method: "POST", authenticated: true, body: { content: "hello" },
    });
  });
  it("maps pagination, read, and summary routes", async () => {
    request.mockResolvedValue({});
    await messagingService.getConversations(2, 10);
    await messagingService.getMessages("a/b", 3, 30);
    await messagingService.markConversationRead("a/b");
    await messagingService.getMessagingSummary();
    expect(request.mock.calls.map(([path]) => path)).toEqual([
      "/conversations?page=2&size=10",
      "/conversations/a%2Fb/messages?page=3&size=30",
      "/conversations/a%2Fb/read",
      "/messaging/summary",
    ]);
  });
  it("omits undefined pagination and rejects blank messages", async () => {
    request.mockResolvedValue({});
    await messagingService.getConversations();
    expect(request).toHaveBeenCalledWith("/conversations", { authenticated: true });
    await expect(messagingService.sendMessage("id", " \n ")).rejects.toMatchObject({
      code: "INVALID_MESSAGE_CONTENT", status: 400,
    });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
