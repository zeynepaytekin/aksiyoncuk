import type { ReactNode } from "react";

import Navbar from "@/components/layout/Navbar";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <main className="brand-canvas min-h-screen text-[#191815]">
      <Navbar />
      {children}
    </main>
  );
}
