import { ApiError, apiRequest } from "@/services/api/apiClient";
import type {
  Conversation,
  ConversationPage,
  Message,
  MessagePage,
  MessagingSummary,
  SendMessageRequest,
  StartConversationRequest,
} from "@/types/messaging";

function query(page?: number, size?: number): string {
  const params = new URLSearchParams();
  if (page !== undefined) params.set("page", String(page));
  if (size !== undefined) params.set("size", String(size));
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const messagingService = {
  startConversation(username: string): Promise<Conversation> {
    const body: StartConversationRequest = { username: username.trim() };
    return apiRequest("/conversations", {
      method: "POST",
      authenticated: true,
      body,
    });
  },
  getConversations(page?: number, size?: number): Promise<ConversationPage> {
    return apiRequest(`/conversations${query(page, size)}`, {
      authenticated: true,
    });
  },
  getConversation(conversationId: string): Promise<Conversation> {
    return apiRequest(`/conversations/${encodeURIComponent(conversationId)}`, {
      authenticated: true,
    });
  },
  sendMessage(conversationId: string, content: string): Promise<Message> {
    const normalized = content.trim();
    if (!normalized) {
      return Promise.reject(
        new ApiError(400, "INVALID_MESSAGE_CONTENT", "Message content is required."),
      );
    }
    const body: SendMessageRequest = { content: normalized };
    return apiRequest(
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
      { method: "POST", authenticated: true, body },
    );
  },
  getMessages(
    conversationId: string,
    page?: number,
    size?: number,
  ): Promise<MessagePage> {
    return apiRequest(
      `/conversations/${encodeURIComponent(conversationId)}/messages${query(page, size)}`,
      { authenticated: true },
    );
  },
  markConversationRead(conversationId: string): Promise<Conversation> {
    return apiRequest(
      `/conversations/${encodeURIComponent(conversationId)}/read`,
      { method: "POST", authenticated: true },
    );
  },
  getMessagingSummary(): Promise<MessagingSummary> {
    return apiRequest("/messaging/summary", { authenticated: true });
  },
};

export type MessagingService = typeof messagingService;
