import type { Metadata } from "next";

import AuthInitializer from "@/components/auth/AuthInitializer";

import "./globals.css";

export const metadata: Metadata = {
  title: "Aksiyoncuk",
  description: "Creative networking platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">
        <AuthInitializer>{children}</AuthInitializer>
      </body>
    </html>
  );
}
