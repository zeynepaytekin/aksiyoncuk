export type ConversationUser = {
  id: string;
  username: string;
  fullName: string;
  professionalTitle: string | null;
};

export type MessageSender = ConversationUser;

export type LatestMessage = {
  id: string;
  content: string;
  createdAt: string;
  sentByCurrentUser: boolean;
};

export type Message = {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
  sentByCurrentUser: boolean;
  sender: MessageSender | null;
};

export type Conversation = {
  id: string;
  type: "DIRECT";
  otherUser: ConversationUser;
  latestMessage: LatestMessage | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PageMetadata = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type ConversationPage = PageMetadata & { content: Conversation[] };
export type MessagePage = PageMetadata & { content: Message[] };

export type MessagingSummary = {
  unreadConversationCount: number;
  unreadMessageCount: number;
};

export type StartConversationRequest = { username: string };
export type SendMessageRequest = { content: string };
export type MessagingStatus = "idle" | "loading" | "loaded" | "error";
