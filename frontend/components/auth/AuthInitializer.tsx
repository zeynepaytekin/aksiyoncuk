"use client";

import { useEffect, type ReactNode } from "react";

import { useAuthStore } from "@/store/auth.store";

type AuthInitializerProps = {
  children: ReactNode;
};

export default function AuthInitializer({ children }: AuthInitializerProps) {
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Restoring your session…
      </div>
    );
  }

  return children;
}
