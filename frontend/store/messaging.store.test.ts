import { beforeEach, describe, expect, it, vi } from "vitest";
import { messagingService } from "@/services/api/messaging.service";
import { useMessagingStore } from "@/store/messaging.store";
import type { Conversation, Message } from "@/types/messaging";

vi.mock("@/services/api/messaging.service", () => ({
  messagingService: {
    startConversation: vi.fn(), getConversations: vi.fn(), getConversation: vi.fn(),
    sendMessage: vi.fn(), getMessages: vi.fn(), markConversationRead: vi.fn(),
    getMessagingSummary: vi.fn(),
  },
}));
const conversation: Conversation = {
  id: "c1", type: "DIRECT",
  otherUser: { id: "u2", username: "other", fullName: "Other", professionalTitle: null },
  latestMessage: null, unreadCount: 2,
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};
const message: Message = {
  id: "m1", conversationId: "c1", content: "Hello",
  createdAt: "2026-01-02T00:00:00Z", sentByCurrentUser: true,
  sender: { id: "me", username: "me", fullName: "Me", professionalTitle: null },
};
const page = { content: [conversation], page: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true };

describe("messaging store", () => {
  beforeEach(() => { vi.clearAllMocks(); useMessagingStore.getState().clearMessagingState(); });
  it("loads conversations and clears private state", async () => {
    vi.mocked(messagingService.getConversations).mockResolvedValue(page);
    await useMessagingStore.getState().loadConversations();
    expect(useMessagingStore.getState().conversations).toEqual([conversation]);
    useMessagingStore.getState().normalizeAfterLogout();
    expect(useMessagingStore.getState().conversations).toEqual([]);
  });
  it("deduplicates identical sends and updates latest message", async () => {
    useMessagingStore.setState({ conversations: [conversation], currentConversation: conversation, activeConversationId: "c1" });
    let resolve!: (value: Message) => void;
    vi.mocked(messagingService.sendMessage).mockReturnValue(new Promise((done) => { resolve = done; }));
    const first = useMessagingStore.getState().sendMessage("c1", " Hello ");
    const duplicate = useMessagingStore.getState().sendMessage("c1", "Hello");
    expect(messagingService.sendMessage).toHaveBeenCalledTimes(1);
    resolve(message);
    await Promise.all([first, duplicate]);
    expect(useMessagingStore.getState().messages).toEqual([message]);
    expect(useMessagingStore.getState().currentConversation?.latestMessage?.content).toBe("Hello");
  });
  it("chronologically merges older pages without duplicate IDs", async () => {
    const old = { ...message, id: "old", createdAt: "2025-12-01T00:00:00Z" };
    useMessagingStore.setState({ activeConversationId: "c1", messages: [message] });
    vi.mocked(messagingService.getMessages).mockResolvedValue({
      content: [message, old], page: 1, size: 30, totalElements: 2, totalPages: 2, first: false, last: true,
    });
    await useMessagingStore.getState().loadMessages("c1", 1, 30);
    expect(useMessagingStore.getState().messages.map(({ id }) => id)).toEqual(["old", "m1"]);
  });
  it("marks read and refreshes summary", async () => {
    useMessagingStore.setState({ activeConversationId: "c1", conversations: [conversation], currentConversation: conversation });
    vi.mocked(messagingService.markConversationRead).mockResolvedValue({ ...conversation, unreadCount: 0 });
    vi.mocked(messagingService.getMessagingSummary).mockResolvedValue({ unreadConversationCount: 0, unreadMessageCount: 0 });
    await useMessagingStore.getState().markConversationRead("c1");
    expect(useMessagingStore.getState().conversations[0].unreadCount).toBe(0);
    expect(useMessagingStore.getState().summary?.unreadMessageCount).toBe(0);
  });
});
