"use client";

import { create } from "zustand";

import { ApiError } from "@/services/api/apiClient";
import { messagingService } from "@/services/api/messaging.service";
import { messagingStateCoordinator } from "@/services/messaging/messagingStateCoordinator";
import type {
  Conversation,
  Message,
  MessagingStatus,
  MessagingSummary,
  PageMetadata,
} from "@/types/messaging";

type LoadOptions = { background?: boolean };

type MessagingState = {
  conversations: Conversation[];
  conversationPage: PageMetadata | null;
  currentConversation: Conversation | null;
  messages: Message[];
  messagePage: PageMetadata | null;
  summary: MessagingSummary | null;
  activeConversationId: string | null;
  conversationsStatus: MessagingStatus;
  conversationStatus: MessagingStatus;
  messagesStatus: MessagingStatus;
  sendStatus: MessagingStatus;
  startStatus: MessagingStatus;
  markReadStatus: MessagingStatus;
  conversationsError: ApiError | null;
  conversationError: ApiError | null;
  messagesError: ApiError | null;
  sendError: ApiError | null;
  startError: ApiError | null;
  markReadError: ApiError | null;
  backgroundError: ApiError | null;
  loadConversations: (page?: number, size?: number, options?: LoadOptions) => Promise<void>;
  loadConversation: (id: string, options?: LoadOptions) => Promise<void>;
  loadMessages: (id: string, page?: number, size?: number, options?: LoadOptions) => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  startConversation: (username: string) => Promise<Conversation>;
  sendMessage: (id: string, content: string) => Promise<Message>;
  markConversationRead: (id: string) => Promise<void>;
  refreshSummary: (options?: LoadOptions) => Promise<void>;
  pollConversations: () => Promise<void>;
  pollActiveConversation: () => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  clearMessagingState: () => void;
  normalizeAfterLogout: () => void;
};

const empty = {
  conversations: [] as Conversation[],
  conversationPage: null as PageMetadata | null,
  currentConversation: null as Conversation | null,
  messages: [] as Message[],
  messagePage: null as PageMetadata | null,
  summary: null as MessagingSummary | null,
  activeConversationId: null as string | null,
  conversationsStatus: "idle" as MessagingStatus,
  conversationStatus: "idle" as MessagingStatus,
  messagesStatus: "idle" as MessagingStatus,
  sendStatus: "idle" as MessagingStatus,
  startStatus: "idle" as MessagingStatus,
  markReadStatus: "idle" as MessagingStatus,
  conversationsError: null as ApiError | null,
  conversationError: null as ApiError | null,
  messagesError: null as ApiError | null,
  sendError: null as ApiError | null,
  startError: null as ApiError | null,
  markReadError: null as ApiError | null,
  backgroundError: null as ApiError | null,
};

let generation = 0;
const requests = new Map<string, Promise<void>>();
const sends = new Map<string, Promise<Message>>();
let startRequest: Promise<Conversation> | null = null;

function mapped(error: unknown, fallback: string): ApiError {
  return error instanceof ApiError ? error : new ApiError(0, "NETWORK_ERROR", fallback);
}
function meta(page: PageMetadata): PageMetadata {
  const { page: number, size, totalElements, totalPages, first, last } = page;
  return { page: number, size, totalElements, totalPages, first, last };
}
function dedupeChronological(messages: Message[]): Message[] {
  return [...new Map(messages.map((message) => [message.id, message])).values()]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
function moveFirst(list: Conversation[], item: Conversation): Conversation[] {
  return [item, ...list.filter(({ id }) => id !== item.id)];
}
function runOnce(key: string, task: () => Promise<void>): Promise<void> {
  const existing = requests.get(key);
  if (existing) return existing;
  const request = task().finally(() => {
    if (requests.get(key) === request) requests.delete(key);
  });
  requests.set(key, request);
  return request;
}

export const useMessagingStore = create<MessagingState>()((set, get) => ({
  ...empty,
  loadConversations(page = 0, size = 20, options = {}) {
    return runOnce(`conversations:${page}:${size}`, async () => {
      const requestGeneration = generation;
      if (!options.background) set({ conversationsStatus: "loading", conversationsError: null });
      try {
        const result = await messagingService.getConversations(page, size);
        if (requestGeneration !== generation) return;
        set({
          conversations: result.content,
          conversationPage: meta(result),
          conversationsStatus: "loaded",
          ...(options.background ? { backgroundError: null } : {}),
        });
      } catch (error) {
        const value = mapped(error, "Conversations could not be loaded.");
        if (requestGeneration === generation) set(options.background
          ? { backgroundError: value }
          : { conversationsStatus: "error", conversationsError: value });
        if (!options.background) throw value;
      }
    });
  },
  loadConversation(id, options = {}) {
    return runOnce(`conversation:${id}`, async () => {
      const requestGeneration = generation;
      if (!options.background) set({ conversationStatus: "loading", conversationError: null });
      try {
        const conversation = await messagingService.getConversation(id);
        if (requestGeneration !== generation || get().activeConversationId !== id) return;
        set((state) => ({
          currentConversation: conversation,
          conversations: state.conversations.some((item) => item.id === id)
            ? state.conversations.map((item) => item.id === id ? conversation : item)
            : state.conversations,
          conversationStatus: "loaded",
          ...(options.background ? { backgroundError: null } : {}),
        }));
      } catch (error) {
        const value = mapped(error, "Conversation could not be loaded.");
        if (requestGeneration === generation && get().activeConversationId === id) set(options.background
          ? { backgroundError: value }
          : { conversationStatus: "error", conversationError: value });
        if (!options.background) throw value;
      }
    });
  },
  loadMessages(id, page = 0, size = 30, options = {}) {
    return runOnce(`messages:${id}:${page}:${size}`, async () => {
      const requestGeneration = generation;
      if (!options.background) set({ messagesStatus: "loading", messagesError: null });
      try {
        const result = await messagingService.getMessages(id, page, size);
        if (requestGeneration !== generation || get().activeConversationId !== id) return;
        set((state) => ({
          messages: page === 0
            ? dedupeChronological([...state.messages, ...result.content])
            : dedupeChronological([...result.content, ...state.messages]),
          messagePage: meta(result),
          messagesStatus: "loaded",
          ...(options.background ? { backgroundError: null } : {}),
        }));
      } catch (error) {
        const value = mapped(error, "Messages could not be loaded.");
        if (requestGeneration === generation && get().activeConversationId === id) set(options.background
          ? { backgroundError: value }
          : { messagesStatus: "error", messagesError: value });
        if (!options.background) throw value;
      }
    });
  },
  loadOlderMessages() {
    const { activeConversationId, messagePage } = get();
    if (!activeConversationId || !messagePage || messagePage.last) return Promise.resolve();
    return get().loadMessages(activeConversationId, messagePage.page + 1, messagePage.size);
  },
  startConversation(username) {
    if (startRequest) return startRequest;
    startRequest = (async () => {
      set({ startStatus: "loading", startError: null });
      try {
        const conversation = await messagingService.startConversation(username);
        set((state) => ({
          conversations: moveFirst(state.conversations, conversation),
          startStatus: "loaded",
        }));
        return conversation;
      } catch (error) {
        const value = mapped(error, "Conversation could not be started.");
        set({ startStatus: "error", startError: value });
        throw value;
      } finally {
        startRequest = null;
      }
    })();
    return startRequest;
  },
  sendMessage(id, content) {
    const normalized = content.trim();
    const key = `${id}\u0000${normalized}`;
    const existing = sends.get(key);
    if (existing) return existing;
    const request = (async () => {
      set({ sendStatus: "loading", sendError: null });
      try {
        const message = await messagingService.sendMessage(id, normalized);
        if (get().activeConversationId === id) {
          set((state) => {
            const previous = state.currentConversation ??
              state.conversations.find((item) => item.id === id) ?? null;
            const updated = previous ? {
              ...previous,
              latestMessage: {
                id: message.id, content: message.content,
                createdAt: message.createdAt, sentByCurrentUser: true,
              },
              updatedAt: message.createdAt,
            } : null;
            return {
              messages: dedupeChronological([...state.messages, message]),
              currentConversation: updated,
              conversations: updated ? moveFirst(state.conversations, updated) : state.conversations,
              sendStatus: "loaded",
            };
          });
        }
        return message;
      } catch (error) {
        const value = mapped(error, "Message could not be sent.");
        set({ sendStatus: "error", sendError: value });
        throw value;
      } finally {
        sends.delete(key);
      }
    })();
    sends.set(key, request);
    return request;
  },
  async markConversationRead(id) {
    if (get().markReadStatus === "loading") return;
    set({ markReadStatus: "loading", markReadError: null });
    try {
      const conversation = await messagingService.markConversationRead(id);
      if (get().activeConversationId !== id) return;
      set((state) => ({
        currentConversation: conversation,
        conversations: state.conversations.map((item) =>
          item.id === id ? { ...conversation, unreadCount: 0 } : item),
        markReadStatus: "loaded",
      }));
      await get().refreshSummary({ background: true });
    } catch (error) {
      set({ markReadStatus: "error", markReadError: mapped(error, "Read status could not be updated.") });
    }
  },
  refreshSummary(options = {}) {
    return runOnce("summary", async () => {
      try {
        const summary = await messagingService.getMessagingSummary();
        set({ summary, ...(options.background ? { backgroundError: null } : {}) });
      } catch (error) {
        const value = mapped(error, "Unread messages could not be loaded.");
        if (options.background) set({ backgroundError: value });
        else throw value;
      }
    });
  },
  pollConversations() {
    const state = get();
    return state.loadConversations(0, state.conversationPage?.size ?? 20, { background: true });
  },
  async pollActiveConversation() {
    const id = get().activeConversationId;
    if (!id) return;
    const previousUnread = get().currentConversation?.unreadCount ?? 0;
    await Promise.all([
      get().loadConversation(id, { background: true }),
      get().loadMessages(id, 0, get().messagePage?.size ?? 30, { background: true }),
    ]);
    if ((get().currentConversation?.unreadCount ?? 0) > previousUnread) {
      await get().markConversationRead(id);
    }
  },
  setActiveConversation(id) {
    if (get().activeConversationId === id) return;
    generation += 1;
    requests.clear();
    set({
      activeConversationId: id,
      currentConversation: null,
      messages: [],
      messagePage: null,
      conversationStatus: "idle",
      messagesStatus: "idle",
      conversationError: null,
      messagesError: null,
      sendError: null,
      markReadError: null,
    });
  },
  clearMessagingState() {
    generation += 1;
    requests.clear();
    sends.clear();
    startRequest = null;
    set(empty);
  },
  normalizeAfterLogout() {
    get().clearMessagingState();
  },
}));

messagingStateCoordinator.configure((authenticated) => {
  useMessagingStore.getState().clearMessagingState();
  if (authenticated) void useMessagingStore.getState().refreshSummary({ background: true });
});
