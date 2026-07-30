"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { freelanceErrorMessage } from "@/services/api/freelanceErrorMessage";
import { useFreelanceStore } from "@/store/freelance.store";
import { formatMarketplaceDate, formatMoney } from "@/utils/formatFreelance";

export default function MyFreelanceServicesPage() {
  const { user, isLoading } = useRequireAuth();
  const store = useFreelanceStore();
  const loadMyServices = useFreelanceStore((state) => state.loadMyServices);
  const [status, setStatus] = useState("");
  useEffect(() => { if (user) void loadMyServices().catch(() => undefined); }, [user, loadMyServices]);
  if (isLoading || !user) return <main className="p-8">Loading…</main>;
  const items = store.myServices?.content.filter((service) => !status || service.status === status) ?? [];
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Freelancer dashboard</h1><p className="text-gray-600">Create and manage your marketplace listings.</p></div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><Link className="rounded-xl border px-4 py-3 text-center font-semibold" href="/freelance/orders?tab=selling">Selling orders</Link><Link className="rounded-xl bg-black px-4 py-3 text-center font-semibold text-white" href="/freelance/create">Create service</Link></div></header>
    <div className="flex flex-wrap gap-2">{["", "DRAFT", "PUBLISHED", "PAUSED", "ARCHIVED"].map((value) =>
      <Button key={value} variant={status === value ? "primary" : "secondary"} onClick={() => setStatus(value)}>{value || "All"}</Button>)}</div>
    {store.myServicesStatus === "loading" && !store.myServices && <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-52" /><Skeleton className="h-52" /></div>}
    {store.myServicesStatus === "error" && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-4 text-red-800"><p>{freelanceErrorMessage(store.myServicesError)}</p><Button size="sm" variant="secondary" onClick={() => void loadMyServices()}>Retry</Button></div>}
    {items.length === 0 && store.myServicesStatus !== "loading" && <EmptyState title="No listings here" description="Create a draft service to get started." />}
    <div className="grid gap-4 md:grid-cols-2">{items.map((service) => <Card key={service.id} className="min-w-0 overflow-hidden">
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">{service.thumbnailUrl ? <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100 sm:aspect-square"><Image src={service.thumbnailUrl} alt={`${service.title} thumbnail`} fill className="object-cover" /></div> : <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400 sm:aspect-square">No image</div>}
      <div className="min-w-0"><div className="flex flex-wrap justify-between gap-3"><div className="min-w-0"><Badge>{service.status}</Badge><h2 className="mt-2 break-words text-lg font-bold">{service.title}</h2><p className="text-sm text-gray-500">{service.category.name}</p></div><span className="text-sm">{service.orderCount} orders</span></div>
      <p className="mt-3 text-sm text-gray-600">{service.lowestPrice === null ? "No active price" : `From ${formatMoney(service.lowestPrice, service.currencyCode)}`} · Updated {formatMarketplaceDate(service.updatedAt)}</p></div></div>
      <div className="mt-5 flex flex-wrap gap-2"><Link className="rounded-xl border px-3 py-2 text-sm font-semibold" href={`/freelance/manage?service=${service.id}`}>Manage</Link>
        {service.status === "PUBLISHED" && <Link className="rounded-xl border px-3 py-2 text-sm font-semibold" href={`/freelance/service?service=${service.id}`}>View public listing</Link>}
        {(service.status === "DRAFT" || service.status === "PAUSED") && <Button size="sm" isLoading={store.mutations[`publish:${service.id}`] === "loading"} onClick={() => void store.publishService(service.id)}>Publish</Button>}
        {service.status === "PUBLISHED" && <Button size="sm" variant="secondary" onClick={() => void store.pauseService(service.id)}>Pause</Button>}
        {service.status !== "ARCHIVED" && <Button size="sm" variant="ghost" onClick={() => confirm("Archive this listing? This is terminal and the listing will become immutable.") && void store.archiveService(service.id)}>Archive</Button>}
      </div>
    </Card>)}</div>
  </main>;
}
