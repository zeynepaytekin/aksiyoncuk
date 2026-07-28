import type { ReactNode } from "react";

import Navbar from "@/components/layout/Navbar";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      {children}
    </main>
  );
}
