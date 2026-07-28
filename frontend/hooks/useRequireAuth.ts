"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/store/auth.store";

export function useRequireAuth() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const status = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (isInitialized && status === "unauthenticated") {
      router.replace("/login");
    }
  }, [isInitialized, router, status]);

  return {
    user,
    isLoading: !isInitialized || status === "initializing" || isLoading,
    logout,
  };
}
