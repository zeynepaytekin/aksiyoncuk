"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Navbar from "../../components/layout/Navbar";
import LeftSidebar from "../../components/home/LeftSidebar";
import Feed from "../../components/home/Feed";
import RightSidebar from "../../components/home/RightSidebar";
import { getUser, User } from "../../lib/auth";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const currentUser = getUser();

    if (!currentUser) {
      router.push("/login");
      return;
    }

    setUser(currentUser);
    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Checking session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <LeftSidebar />
        </div>

        <div className="lg:col-span-6">
          <Feed />
        </div>

        <div className="lg:col-span-3">
          <RightSidebar />
        </div>
      </div>
    </main>
  );
} 