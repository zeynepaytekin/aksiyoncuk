import type { Message } from "@/types/messaging";
import { formatUtcDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";

export default function MessageBubble({ message }: { message: Message }) {
  const sender = message.sentByCurrentUser ? "You" : message.sender?.fullName ?? "Deleted user";
  return (
    <li className={cn("flex", message.sentByCurrentUser ? "justify-end" : "justify-start")}>
      <article aria-label={`Message from ${sender}`} className={cn("max-w-[80%] rounded-2xl px-4 py-2",
        message.sentByCurrentUser ? "bg-black text-white" : "bg-gray-100 text-gray-900")}>
        {!message.sentByCurrentUser && <p className="mb-1 text-xs font-semibold">{sender}</p>}
        <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
        <time dateTime={message.createdAt} className={cn("mt-1 block text-[10px]", message.sentByCurrentUser ? "text-gray-300" : "text-gray-500")}>
          {formatUtcDate(message.createdAt)}
        </time>
      </article>
    </li>
  );
}
