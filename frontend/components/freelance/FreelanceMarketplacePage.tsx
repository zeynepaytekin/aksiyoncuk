"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { useAuthStore } from "@/store/auth.store";
import { useFreelanceStore } from "@/store/freelance.store";
import type { FreelancePackageTier, FreelanceSearchFilters, FreelanceSearchSort } from "@/types/freelance";
import FreelanceServiceCard from "./FreelanceServiceCard";

export function filtersFromQuery(query: string): FreelanceSearchFilters {
  const params = new URLSearchParams(query);
  return {
    q: params.get("q") || undefined,
    category: params.get("category") || undefined,
    sellerId: params.get("sellerId") || undefined,
    minPrice: params.get("minPrice") || undefined,
    maxPrice: params.get("maxPrice") || undefined,
    deliveryDaysMax: Number(params.get("deliveryDaysMax")) || undefined,
    minimumRating: params.get("minimumRating") || undefined,
    packageTier: (params.get("packageTier") as FreelancePackageTier) || undefined,
    sort: (params.get("sort") as FreelanceSearchSort) || "NEWEST",
    page: Number(params.get("page")) || 0,
    size: 12,
  };
}

function Content() {
  const router = useRouter(), params = useSearchParams();
  const categories = useFreelanceStore((state) => state.categories);
  const categoriesStatus = useFreelanceStore((state) => state.categoriesStatus);
  const services = useFreelanceStore((state) => state.services);
  const mutations = useFreelanceStore((state) => state.mutations);
  const searchStatus = useFreelanceStore((state) => state.searchStatus);
  const loadCategories = useFreelanceStore((state) => state.loadCategories);
  const searchServices = useFreelanceStore((state) => state.searchServices);
  const setServiceSaved = useFreelanceStore((state) => state.setServiceSaved);
  const user = useAuthStore((state) => state.user);
  const key = params.toString();
  const filters = useMemo(() => filtersFromQuery(key), [key]);
  useEffect(() => { void loadCategories().catch(() => undefined); }, [loadCategories]);
  useEffect(() => { void searchServices(filters).catch(() => undefined); }, [filters, searchServices]);
  function apply(values: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(values).forEach(([name, value]) => value ? next.set(name, value) : next.delete(name));
    if (!("page" in values)) next.delete("page");
    router.push(`/freelance${next.size ? `?${next}` : ""}`);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    apply({ q: value || undefined });
  }
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
    <section className="relative overflow-hidden rounded-[2rem] border border-[#191815] bg-[#191815] px-6 py-12 text-white shadow-[6px_6px_0_#f5a56f] sm:px-10">
      <div className="absolute -right-14 -top-16 h-56 w-56 rounded-full border border-[#191815] bg-[#f7e98b]" />
      <div className="absolute bottom-8 right-24 hidden rotate-6 rounded-full border border-white/60 bg-[#f5a56f] px-4 py-2 text-xs font-black text-[#191815] md:block">made by real people ✦</div>
      <p className="relative text-xs font-black uppercase tracking-[.18em] text-[#f5a56f]">The creative exchange</p>
      <h1 className="display-type relative mt-4 max-w-3xl text-5xl sm:text-7xl">Find the missing piece.</h1>
      <p className="relative mt-5 max-w-xl text-[#d8d0c5]">Editors, composers, colorists, makers. Thoughtfully packaged creative help from people who care about the work.</p>
      <form onSubmit={submit} role="search" className="mt-8 flex max-w-2xl gap-2">
        <label htmlFor="marketplace-search" className="sr-only">Search marketplace services</label>
        <input key={filters.q ?? ""} id="marketplace-search" name="q" type="search" defaultValue={filters.q ?? ""}
          className="min-w-0 flex-1 rounded-full border border-white bg-[#fffdf8] px-5 py-3 text-[#191815] outline-none" placeholder="What are you trying to make?" />
        <Button type="submit" variant="secondary" className="bg-white">Search</Button>
      </form>
    </section>
    <section aria-labelledby="results-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="flex flex-wrap items-center gap-3"><h2 id="results-title" className="text-2xl font-bold">Services</h2>
          {user && <Link href="/freelance/saved" className="rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-2">Saved services</Link>}</div>
          <p aria-live="polite" className="text-sm text-gray-500">{services ? `${services.totalElements} results` : "Loading results"}</p></div>
        <div className="flex flex-wrap gap-2">
          <label className="text-sm">Category<select aria-label="Category" value={filters.category ?? ""}
            disabled={categoriesStatus === "loading"} onChange={(e) => apply({ category: e.target.value || undefined })}
            className="ml-2 max-w-48 rounded-lg border p-2">
            <option value="">{categoriesStatus === "loading" ? "Loading categories…" : "All categories"}</option>
            {categories.flatMap((category) => [category, ...category.children]).map((category) =>
              <option key={category.id} value={category.slug}>{category.name}</option>)}
          </select></label>
          <label className="text-sm">Min price<input aria-label="Minimum price" inputMode="decimal" defaultValue={filters.minPrice}
            onBlur={(e) => apply({ minPrice: e.target.value || undefined })} className="ml-2 w-24 rounded-lg border p-2" /></label>
          <label className="text-sm">Max price<input aria-label="Maximum price" inputMode="decimal" defaultValue={filters.maxPrice}
            onBlur={(e) => apply({ maxPrice: e.target.value || undefined })} className="ml-2 w-24 rounded-lg border p-2" /></label>
          <select aria-label="Package tier" value={filters.packageTier ?? ""} onChange={(e) => apply({ packageTier: e.target.value || undefined })} className="rounded-lg border p-2">
            <option value="">Any package</option><option>BASIC</option><option>STANDARD</option><option>PREMIUM</option>
          </select>
          <select aria-label="Minimum rating" value={filters.minimumRating ?? ""} onChange={(e) => apply({ minimumRating: e.target.value || undefined })} className="rounded-lg border p-2">
            <option value="">Any rating</option><option value="3">3+</option><option value="4">4+</option><option value="4.5">4.5+</option>
          </select>
          <select aria-label="Sort services" value={filters.sort} onChange={(e) => apply({ sort: e.target.value })} className="rounded-lg border p-2">
            <option value="NEWEST">Newest</option><option value="OLDEST">Oldest</option><option value="PRICE_ASC">Price: low to high</option>
            <option value="PRICE_DESC">Price: high to low</option><option value="RATING_DESC">Highest rated</option><option value="DELIVERY_ASC">Fastest delivery</option><option value="POPULAR">Most popular</option>
          </select>
          <Button variant="ghost" onClick={() => router.push("/freelance")}>Clear filters</Button>
        </div>
      </div>
      {searchStatus === "loading" && !services && <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /></div>}
      {services?.content.length === 0 && <EmptyState title="No services found" description="Try changing or clearing your filters." />}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services?.content.map((service) => <FreelanceServiceCard key={service.id} service={service}
          isSaving={mutations[`saved:${service.id}`] === "loading"}
          onSavedChange={(item, saved) => {
            if (!user) { router.push("/login"); return; }
            void setServiceSaved(item.id, saved).catch(() => undefined);
          }} />)}
      </div>
      {services && services.totalPages > 1 && <nav aria-label="Marketplace pagination" className="mt-8 flex justify-center gap-3">
        <Button variant="secondary" disabled={services.first} onClick={() => apply({ page: String(services.page - 1) })}>Previous</Button>
        <span className="self-center text-sm">Page {services.page + 1} of {services.totalPages}</span>
        <Button variant="secondary" disabled={services.last} onClick={() => apply({ page: String(services.page + 1) })}>Next</Button>
      </nav>}
    </section>
  </main>;
}
export default function FreelanceMarketplacePage() { return <Suspense><Content /></Suspense>; }
