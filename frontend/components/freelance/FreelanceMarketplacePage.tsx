"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { useFreelanceStore } from "@/store/freelance.store";
import type { FreelancePackageTier, FreelanceSearchFilters, FreelanceSearchSort } from "@/types/freelance";
import { formatMoney } from "@/utils/formatFreelance";

function filtersFromQuery(query: string): FreelanceSearchFilters {
  const params = new URLSearchParams(query);
  return {
    q: params.get("q") || undefined,
    category: params.get("category") || undefined,
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
  const searchStatus = useFreelanceStore((state) => state.searchStatus);
  const loadCategories = useFreelanceStore((state) => state.loadCategories);
  const searchServices = useFreelanceStore((state) => state.searchServices);
  const [q, setQ] = useState(params.get("q") ?? "");
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
  function submit(event: FormEvent) { event.preventDefault(); apply({ q: q.trim() || undefined }); }
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
    <section className="rounded-3xl bg-gray-950 px-6 py-12 text-white sm:px-10">
      <p className="text-sm font-semibold uppercase tracking-widest text-gray-300">Aksiyoncuk Marketplace</p>
      <h1 className="mt-3 max-w-3xl text-3xl font-bold sm:text-5xl">Find creative services, clearly packaged.</h1>
      <p className="mt-4 max-w-2xl text-gray-300">Browse independent creative professionals. Orders are requests only—no payment is processed at this stage.</p>
      <form onSubmit={submit} role="search" className="mt-8 flex max-w-2xl gap-2">
        <label htmlFor="marketplace-search" className="sr-only">Search marketplace services</label>
        <input id="marketplace-search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
          className="min-w-0 flex-1 rounded-xl bg-white px-4 py-3 text-gray-950" placeholder="Logo design, editing, sound…" />
        <Button type="submit" variant="secondary" className="bg-white">Search</Button>
      </form>
    </section>
    <section aria-labelledby="categories-title">
      <h2 id="categories-title" className="text-2xl font-bold">Categories</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant={!filters.category ? "primary" : "secondary"} onClick={() => apply({ category: undefined })}>All</Button>
        {categoriesStatus === "loading" && <span>Loading categories…</span>}
        {categories.flatMap((category) => [category, ...category.children]).map((category) =>
          <Button key={category.id} variant={filters.category === category.slug ? "primary" : "secondary"}
            onClick={() => apply({ category: category.slug })}>{category.name}</Button>)}
      </div>
    </section>
    <section aria-labelledby="results-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 id="results-title" className="text-2xl font-bold">Services</h2>
          <p aria-live="polite" className="text-sm text-gray-500">{services ? `${services.totalElements} results` : "Loading results"}</p></div>
        <div className="flex flex-wrap gap-2">
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
            <option value="NEWEST">Newest</option><option value="PRICE_ASC">Price: low to high</option>
            <option value="PRICE_DESC">Price: high to low</option><option value="RATING_DESC">Highest rated</option><option value="DELIVERY_ASC">Fastest delivery</option><option value="POPULAR">Most popular</option>
          </select>
          <Button variant="ghost" onClick={() => { setQ(""); router.push("/freelance"); }}>Clear filters</Button>
        </div>
      </div>
      {searchStatus === "loading" && !services && <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /></div>}
      {services?.content.length === 0 && <EmptyState title="No services found" description="Try changing or clearing your filters." />}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services?.content.map((service) => <Link key={service.id} href={`/freelance/service?service=${encodeURIComponent(service.id)}`} className="focus-visible:outline-2">
          <Card className="h-full overflow-hidden p-0">
            <div className="relative aspect-video bg-gray-100">{service.thumbnailUrl
              ? <Image src={service.thumbnailUrl} alt={`${service.title} preview`} fill className="object-cover" />
              : <div className="flex h-full items-center justify-center text-gray-400">No image</div>}</div>
            <div className="space-y-3 p-5"><p className="text-xs font-semibold uppercase text-gray-500">{service.category.name}</p>
              <h3 className="text-lg font-bold">{service.title}</h3>
              <p className="text-sm text-gray-600">{service.seller.fullName || service.seller.username}</p>
              <div className="flex justify-between text-sm"><span>{service.averageRating === null ? "New" : `★ ${service.averageRating} (${service.reviewCount})`}</span>
                <strong>From {formatMoney(service.lowestPrice, service.currencyCode)}</strong></div>
              <p className="text-xs text-gray-500">{service.shortestDeliveryDays ? `${service.shortestDeliveryDays} day delivery` : "Delivery varies"} · {service.orderCount} completed</p>
            </div>
          </Card></Link>)}
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
