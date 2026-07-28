"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";

export default function Navbar() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/profile" className="hover:text-black">
            Profile
        </Link>
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black font-bold text-white">
            A
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Aksiyoncuk</h1>
            <p className="text-xs text-gray-500">
              Creative Networking Platform
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <Link href="/home" className="hover:text-black">
            Home
          </Link>
          <Link href="#" className="hover:text-black">
            Network
          </Link>
          <Link href="#" className="hover:text-black">
            Jobs
          </Link>
          <Link href="#" className="hover:text-black">
            Crowdfunding
          </Link>
          <Link href="#" className="hover:text-black">
            Films
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm font-medium text-gray-700 md:inline">
                {user.fullName || user.email}
              </span>
              <Button
                variant="secondary"
                shape="pill"
                onClick={handleLogout}
                className="font-medium"
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Join Now
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
