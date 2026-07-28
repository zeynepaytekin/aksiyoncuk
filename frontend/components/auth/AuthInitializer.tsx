"use client";

import { useEffect, type ReactNode } from "react";

import { useAuthStore } from "@/store/auth.store";

type AuthInitializerProps = {
  children: ReactNode;
};

export default function AuthInitializer({ children }: AuthInitializerProps) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return children;
}
