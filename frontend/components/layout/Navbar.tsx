"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import Button from "@/components/ui/Button";
import { useNotificationSummaryPolling } from "@/hooks/useNotificationSummaryPolling";
import { useMessagingSummaryPolling } from "@/hooks/useMessagingPolling";
import { useAuthStore } from "@/store/auth.store";
import { useMessagingStore } from "@/store/messaging.store";
import { useNotificationsStore } from "@/store/notifications.store";

const navItems = [
  ["/home", "Feed"], ["/network", "People"], ["/jobs", "Opportunities"], ["/freelance", "Marketplace"],
] as const;

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHint, setSearchHint] = useState("");
  const unreadCount = useNotificationsStore((state) => state.summary?.unreadCount ?? 0);
  const unreadMessageCount = useMessagingStore((state) => state.summary?.unreadMessageCount ?? 0);
  useNotificationSummaryPolling();
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
    <header className="sticky top-0 z-50 border-b border-[#191815] bg-[#fbf7ee]/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center gap-3 px-4">
        <Link href="/home" className="mr-2 flex shrink-0 items-center gap-2 font-black tracking-[-.04em]">
          <span className="flex h-10 w-10 rotate-[-5deg] items-center justify-center rounded-[40%_60%_45%_55%] border border-[#191815] bg-[#f5a56f] text-lg shadow-[2px_2px_0_#191815]">A</span>
          <span className="hidden text-lg sm:block">aksiyoncuk</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {navItems.map(([href, label]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return <Link key={href} href={href} className={`rounded-full px-3.5 py-2 text-sm font-bold ${active ? "bg-[#191815] text-white" : "text-[#625d55] hover:bg-[#f7e98b] hover:text-[#191815]"}`}>{label}</Link>;
          })}
        </nav>

        <form role="search" onSubmit={submitSearch} className="ml-auto hidden w-36 sm:block lg:w-44">
          <label htmlFor="navbar-search" className="sr-only">Search people, posts, works, and jobs</label>
          <input id="navbar-search" type="search" value={searchQuery} maxLength={100}
            onChange={(event) => { setSearchQuery(event.target.value); setSearchHint(""); }}
            placeholder="Search the scene…"
            className="w-full rounded-full border border-[#c9c0b2] bg-[#fffdf8] px-4 py-2.5 text-xs outline-none placeholder:text-[#928b80] focus:border-[#191815] focus:shadow-[2px_2px_0_#f7e98b]"
            aria-describedby={searchHint ? "navbar-search-hint" : undefined} />
          {searchHint && <span id="navbar-search-hint" className="sr-only" role="alert">{searchHint}</span>}
        </form>

        <div className="flex items-center gap-2">
          {user ? <>
            <IconLink href="/messages" label={`Messages, ${unreadMessageCount} unread`} count={unreadMessageCount} icon="message" />
            <IconLink href="/notifications" label={`Notifications, ${unreadCount} unread`} count={unreadCount} icon="bell" />
            <Link href="/profile" className="hidden items-center gap-2 rounded-full border border-[#191815] bg-[#f7e98b] py-1.5 pl-1.5 pr-3 text-xs font-bold hover:-translate-y-0.5 md:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#191815] text-white">{user.fullName.slice(0, 1)}</span>
              {user.fullName.split(" ")[0]}
            </Link>
            <Button variant="ghost" shape="pill" size="sm" onClick={handleLogout} isLoading={isLoggingOut} loadingText="…" disabled={isLoggingOut}>Exit</Button>
          </> : <>
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-bold hover:bg-[#f7e98b]">Sign in</Link>
            <Link href="/register" className="rounded-full border border-[#191815] bg-[#191815] px-4 py-2 text-sm font-bold text-white shadow-[2px_2px_0_#f5a56f]">Join</Link>
          </>}
        </div>
      </div>
      <nav className="flex overflow-x-auto border-t border-[#ded6ca] px-3 py-2 lg:hidden" aria-label="Mobile navigation">
        {navItems.map(([href, label]) => <Link key={href} href={href} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${pathname === href ? "bg-[#191815] text-white" : "text-[#625d55]"}`}>{label}</Link>)}
        <Link href="/applications" className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-[#625d55]">Applications</Link>
      </nav>
    </header>
  );
}

function IconLink({ href, label, count, icon }: { href: string; label: string; count: number; icon: "message" | "bell" }) {
  return <Link href={href} aria-label={label} className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#c9c0b2] bg-[#fffdf8] text-[#191815] hover:-translate-y-0.5 hover:border-[#191815] hover:bg-[#fbd8bf]">
    {icon === "message" ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M4 5h16v12H8l-4 3V5Z" /></svg> : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>}
    {count > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full border border-[#191815] bg-[#f5a56f] px-1 py-0.5 text-center text-[9px] font-black">{count > 99 ? "99+" : count}</span>}
  </Link>;
}
