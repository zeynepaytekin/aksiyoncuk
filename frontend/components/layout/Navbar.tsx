"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { useNotificationSummaryPolling } from "@/hooks/useNotificationSummaryPolling";
import { useMessagingSummaryPolling } from "@/hooks/useMessagingPolling";
import { useMessagingStore } from "@/store/messaging.store";

export default function Navbar() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHint, setSearchHint] = useState("");
  const unreadCount = useNotificationsStore(
    (state) => state.summary?.unreadCount ?? 0,
  );
  useNotificationSummaryPolling();
  const unreadMessageCount = useMessagingStore(
    (state) => state.summary?.unreadMessageCount ?? 0,
  );
  useMessagingSummaryPolling();

  function handleLogout() {
    setIsLoggingOut(true);
    void logout();
    router.push("/");
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = searchQuery.trim();
    if (normalized.length < 2 || normalized.length > 100) {
      setSearchHint("Enter between 2 and 100 characters.");
      return;
    }
    setSearchHint("");
    router.push(`/search?q=${encodeURIComponent(normalized)}`);
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
          <Link href="/network" className="hover:text-black">
            Network
          </Link>
          <Link href="/jobs" className="hover:text-black">
            Jobs
          </Link>
          <Link href="/freelance" className="hover:text-black">
            Marketplace
          </Link>
          <Link href="#" className="hover:text-black">
            Crowdfunding
          </Link>
        </nav>

        <form
          role="search"
          onSubmit={submitSearch}
          className="w-24 sm:w-40 lg:min-w-40 lg:max-w-56"
        >
          <label htmlFor="navbar-search" className="sr-only">
            Search people, posts, works, and jobs
          </label>
          <input
            id="navbar-search"
            type="search"
            value={searchQuery}
            maxLength={100}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchHint("");
            }}
            placeholder="Search"
            className="w-full rounded-full border border-gray-300 px-4 py-2 text-sm outline-none focus:border-gray-600"
            aria-describedby={searchHint ? "navbar-search-hint" : undefined}
          />
          {searchHint && (
            <span id="navbar-search-hint" className="sr-only" role="alert">
              {searchHint}
            </span>
          )}
        </form>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/messages"
                aria-label={`Messages, ${unreadMessageCount} unread`}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-black"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <path d="M4 5h16v12H8l-4 3V5Z" />
                </svg>
                {unreadMessageCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-black px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                    {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                    <span className="sr-only"> unread messages</span>
                  </span>
                )}
              </Link>
              <Link
                href="/notifications"
                aria-label={`Notifications, ${unreadCount} unread`}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-black"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M10 21h4" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-black px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                    <span className="sr-only"> unread notifications</span>
                  </span>
                )}
              </Link>
              <span className="hidden text-sm font-medium text-gray-700 md:inline">
                {user.fullName || user.email}
              </span>
              <Link href="/applications" className="text-sm font-medium text-gray-700 hover:text-black">
                Applications
              </Link>
              <Button
                variant="secondary"
                shape="pill"
                onClick={handleLogout}
                className="font-medium"
                isLoading={isLoggingOut}
                loadingText="Logging out…"
                disabled={isLoggingOut}
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
