"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/store/auth.store";
import { useNotificationsStore } from "@/store/notifications.store";

export const NOTIFICATION_POLL_INTERVAL_MS = 60_000;

export function useNotificationSummaryPolling(): void {
  const authenticated = useAuthStore(
    (state) => state.isInitialized && state.status === "authenticated",
  );
  const loadSummary = useNotificationsStore((state) => state.loadSummary);

  useEffect(() => {
    if (!authenticated) return;
    const refresh = () => {
      if (document.visibilityState === "visible") {
        void loadSummary().catch(() => undefined);
      }
    };
    refresh();
    const interval = window.setInterval(refresh, NOTIFICATION_POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [authenticated, loadSummary]);
}
