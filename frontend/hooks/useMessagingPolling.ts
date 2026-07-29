"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useMessagingStore } from "@/store/messaging.store";

export const MESSAGING_SUMMARY_POLL_MS = 25_000;
export const CONVERSATION_LIST_POLL_MS = 12_000;
export const ACTIVE_CONVERSATION_POLL_MS = 6_000;

function useVisiblePolling(enabled: boolean, callback: () => void, intervalMs: number) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      if (document.visibilityState === "visible") callbackRef.current();
    };
    refresh();
    const interval = window.setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [enabled, intervalMs]);
}

export function useMessagingSummaryPolling(): void {
  const authenticated = useAuthStore(
    (state) => state.isInitialized && state.status === "authenticated",
  );
  const refreshSummary = useMessagingStore((state) => state.refreshSummary);
  useVisiblePolling(authenticated, () => {
    void refreshSummary({ background: true });
  }, MESSAGING_SUMMARY_POLL_MS);
}

export function useConversationListPolling(enabled: boolean): void {
  const poll = useMessagingStore((state) => state.pollConversations);
  useVisiblePolling(enabled, () => void poll(), CONVERSATION_LIST_POLL_MS);
}

export function useActiveConversationPolling(enabled: boolean): void {
  const poll = useMessagingStore((state) => state.pollActiveConversation);
  useVisiblePolling(enabled, () => void poll(), ACTIVE_CONVERSATION_POLL_MS);
}
