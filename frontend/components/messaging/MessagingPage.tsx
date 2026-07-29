"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import ConversationList from "./ConversationList";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";
import StartConversationDialog from "./StartConversationDialog";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormError from "@/components/ui/FormError";
import Skeleton from "@/components/ui/Skeleton";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useActiveConversationPolling, useConversationListPolling } from "@/hooks/useMessagingPolling";
import { getMessagingErrorMessage } from "@/services/api/messagingErrorMessage";
import { useMessagingStore } from "@/store/messaging.store";

export default function MessagingPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const router = useRouter();
  const params = useSearchParams();
  const routeId = params.get("conversation");
  const [dialogOpen, setDialogOpen] = useState(false);
  const conversations = useMessagingStore((state) => state.conversations);
  const listStatus = useMessagingStore((state) => state.conversationsStatus);
  const listError = useMessagingStore((state) => state.conversationsError);
  const conversation = useMessagingStore((state) => state.currentConversation);
  const conversationStatus = useMessagingStore((state) => state.conversationStatus);
  const conversationError = useMessagingStore((state) => state.conversationError);
  const messages = useMessagingStore((state) => state.messages);
  const messagePage = useMessagingStore((state) => state.messagePage);
  const messagesStatus = useMessagingStore((state) => state.messagesStatus);
  const messagesError = useMessagingStore((state) => state.messagesError);
  const markReadError = useMessagingStore((state) => state.markReadError);
  const loadConversations = useMessagingStore((state) => state.loadConversations);
  const loadConversation = useMessagingStore((state) => state.loadConversation);
  const loadMessages = useMessagingStore((state) => state.loadMessages);
  const loadOlder = useMessagingStore((state) => state.loadOlderMessages);
  const markRead = useMessagingStore((state) => state.markConversationRead);
  const setActive = useMessagingStore((state) => state.setActiveConversation);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousHeight = useRef<number | null>(null);
  const initialScrollDone = useRef(false);

  const openConversation = useCallback((id: string | null) => {
    router.push(id ? `/messages?conversation=${encodeURIComponent(id)}` : "/messages");
  }, [router]);
  useConversationListPolling(Boolean(user));
  useActiveConversationPolling(Boolean(user && routeId));

  useEffect(() => {
    if (user && listStatus === "idle") void loadConversations().catch(() => undefined);
  }, [listStatus, loadConversations, user]);
  useEffect(() => {
    setActive(routeId);
    initialScrollDone.current = false;
    if (!user || !routeId) return;
    void Promise.all([loadConversation(routeId), loadMessages(routeId)])
      .then(() => markRead(routeId))
      .catch(() => undefined);
  }, [loadConversation, loadMessages, markRead, routeId, setActive, user]);
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element || messagesStatus !== "loaded") return;
    if (previousHeight.current !== null) {
      element.scrollTop += element.scrollHeight - previousHeight.current;
      previousHeight.current = null;
    } else if (!initialScrollDone.current) {
      element.scrollTop = element.scrollHeight;
      initialScrollDone.current = true;
    }
  }, [messages.length, messagesStatus]);
  const scrollAfterSend = () => requestAnimationFrame(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  });
  async function older() {
    const element = scrollRef.current;
    if (element) previousHeight.current = element.scrollHeight;
    try { await loadOlder(); } catch { previousHeight.current = null; }
  }

  if (authLoading || !user) return <AppShell><div className="mx-auto max-w-6xl px-4 py-8"><Skeleton aria-label="Loading messages" className="h-[70vh]" /></div></AppShell>;
  const detailLoading = routeId && (conversationStatus === "loading" || messagesStatus === "loading") && !conversation;
  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-5 flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900">Messages</h1><p className="text-sm text-gray-500">Direct conversations with your creative network.</p></div>
          <Button onClick={() => setDialogOpen(true)}>New message</Button>
        </div>
        <Card className="h-[70vh] overflow-hidden p-0">
          <div className="grid h-full md:grid-cols-[minmax(280px,36%)_1fr]">
            <nav aria-label="Message conversations" className={`${routeId ? "hidden md:block" : "block"} overflow-y-auto border-r border-gray-200`}>
              {listStatus === "loading" && !conversations.length && <div className="space-y-2 p-4" aria-live="polite"><span className="sr-only">Loading conversations</span><Skeleton className="h-20" /><Skeleton className="h-20" /></div>}
              {listStatus === "error" && listError && !conversations.length && <EmptyState title="Unable to load conversations" description={getMessagingErrorMessage(listError)} action={<Button onClick={() => void loadConversations().catch(() => undefined)}>Try again</Button>} />}
              {conversations.length > 0 || listStatus === "loaded" ? <ConversationList conversations={conversations} selectedId={routeId} onSelect={openConversation} /> : null}
            </nav>
            <section aria-label="Active conversation" className={`${routeId ? "flex" : "hidden md:flex"} min-h-0 flex-col`}>
              {!routeId && <div className="m-auto"><EmptyState title="Select a conversation" description="Choose a conversation or start a new message." /></div>}
              {detailLoading && <div className="space-y-3 p-5" aria-live="polite"><span className="sr-only">Loading conversation</span><Skeleton className="h-16" /><Skeleton className="h-40" /></div>}
              {routeId && conversationStatus === "error" && conversationError && <div className="m-auto"><EmptyState title={conversationError.code === "CONVERSATION_ACCESS_FORBIDDEN" ? "Conversation unavailable" : "Unable to open conversation"} description={getMessagingErrorMessage(conversationError)} action={<Button onClick={() => openConversation(null)}>Back to conversations</Button>} /></div>}
              {routeId && conversation && (
                <>
                  <header className="flex items-center gap-3 border-b border-gray-200 p-4">
                    <Button type="button" variant="ghost" size="sm" className="md:hidden" onClick={() => openConversation(null)} aria-label="Back to conversation list">← Back</Button>
                    <Avatar fallback={conversation.otherUser.fullName.slice(0, 1).toUpperCase()} />
                    <div className="min-w-0 flex-1"><Link href={`/users?username=${encodeURIComponent(conversation.otherUser.username)}`} className="font-semibold text-gray-900 hover:underline">{conversation.otherUser.fullName}</Link>{conversation.otherUser.professionalTitle && <p className="truncate text-xs text-gray-500">{conversation.otherUser.professionalTitle}</p>}</div>
                  </header>
                  <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
                    {!messagePage?.last && <div className="mb-4 text-center"><Button variant="secondary" size="sm" onClick={() => void older()} disabled={messagesStatus === "loading"}>Load older messages</Button></div>}
                    {messagesError && !messages.length && <EmptyState title="Unable to load messages" description={getMessagingErrorMessage(messagesError)} action={<Button onClick={() => void loadMessages(routeId).catch(() => undefined)}>Try again</Button>} />}
                    {messagesStatus === "loaded" && !messages.length && <EmptyState title="No messages yet" description="Say hello to begin the conversation." />}
                    <ol className="space-y-3" aria-label="Messages">{messages.map((message) => <MessageBubble key={message.id} message={message} />)}</ol>
                  </div>
                  {markReadError && <div className="px-4 pt-2" role="status"><FormError message="Messages are visible, but read status could not be updated." /></div>}
                  <MessageComposer conversationId={routeId} onSent={scrollAfterSend} />
                </>
              )}
            </section>
          </div>
        </Card>
        <StartConversationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onStarted={openConversation} />
      </main>
    </AppShell>
  );
}
