import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import UnreadBadge from "./UnreadBadge";
import type { Conversation } from "@/types/messaging";
import { formatUtcDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";

export default function ConversationList({
  conversations, selectedId, onSelect,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!conversations.length) return <EmptyState title="No conversations yet" description="Start a direct conversation using a username." />;
  return (
    <ul aria-label="Conversations" className="divide-y divide-gray-100">
      {conversations.map((conversation) => {
        const user = conversation.otherUser;
        const preview = conversation.latestMessage
          ? `${conversation.latestMessage.sentByCurrentUser ? "You: " : ""}${conversation.latestMessage.content}`
          : "No messages yet";
        return (
          <li key={conversation.id}>
            <button type="button" onClick={() => onSelect(conversation.id)}
              aria-label={`Conversation with ${user.fullName}, ${conversation.unreadCount} unread`}
              aria-current={selectedId === conversation.id ? "page" : undefined}
              className={cn("flex w-full items-start gap-3 p-4 text-left outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black",
                selectedId === conversation.id && "bg-gray-100")}>
              <Avatar fallback={user.fullName.slice(0, 1).toUpperCase()} />
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="truncate font-semibold text-gray-900">{user.fullName}</span>
                  {conversation.latestMessage && <time dateTime={conversation.latestMessage.createdAt} className="shrink-0 text-[10px] text-gray-400">{formatUtcDate(conversation.latestMessage.createdAt)}</time>}
                </span>
                <span className="block truncate text-xs text-gray-500">@{user.username}{user.professionalTitle ? ` · ${user.professionalTitle}` : ""}</span>
                <span className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-gray-600">{preview}</span>
                  <UnreadBadge count={conversation.unreadCount} />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
