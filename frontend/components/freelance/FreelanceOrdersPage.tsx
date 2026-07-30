"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useFreelanceStore } from "@/store/freelance.store";
import type { FreelanceOrderStatus } from "@/types/freelance";
import { formatMarketplaceDate, formatMoney } from "@/utils/formatFreelance";
function Content() {
  const router = useRouter(), params = useSearchParams(), tab = params.get("tab") === "selling" ? "selling" : "buying";
  const status = (params.get("status") || undefined) as FreelanceOrderStatus | undefined;
  const page = Number(params.get("page")) || 0, { user, isLoading } = useRequireAuth(), store = useFreelanceStore();
  const loadBuyingOrders = useFreelanceStore((state) => state.loadBuyingOrders);
  const loadSellingOrders = useFreelanceStore((state) => state.loadSellingOrders);
  useEffect(() => {
    if (!user) return;
    const request = tab === "buying" ? loadBuyingOrders : loadSellingOrders;
    void request({ status, page }).catch(() => undefined);
  }, [user, tab, status, page, loadBuyingOrders, loadSellingOrders]);
  if (isLoading || !user) return <main className="p-8">Loading…</main>;
  const result = tab === "buying" ? store.buyingOrders : store.sellingOrders;
  const go = (next: Record<string, string | undefined>) => { const q = new URLSearchParams(params); Object.entries(next).forEach(([k,v]) => v ? q.set(k,v) : q.delete(k)); router.push(`/freelance/orders?${q}`); };
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8"><header className="flex justify-between gap-4"><div><h1 className="text-3xl font-bold">Freelance orders</h1><p className="text-gray-600">Order creation does not mean payment has been processed.</p></div><Link href="/freelance/manage" className="font-semibold">Seller dashboard</Link></header>
    <div className="flex flex-wrap gap-2"><Button variant={tab === "buying" ? "primary" : "secondary"} onClick={() => go({ tab: "buying", page: undefined })}>Buying</Button><Button variant={tab === "selling" ? "primary" : "secondary"} onClick={() => go({ tab: "selling", page: undefined })}>Selling</Button>
      <select aria-label="Filter order status" value={status ?? ""} onChange={(e) => go({ status: e.target.value || undefined, page: undefined })} className="rounded-xl border px-3">
        <option value="">All statuses</option>{["CREATED","IN_PROGRESS","DELIVERED","REVISION_REQUESTED","CANCELLATION_REQUESTED","COMPLETED","CANCELLED"].map((s) => <option key={s}>{s}</option>)}</select></div>
    {result?.content.length === 0 && <EmptyState title={`No ${tab} orders`} />}
    <div className="grid gap-4">{result?.content.map((order) => <Link key={order.id} href={`/freelance/order?order=${order.id}`}><Card className="transition hover:border-gray-400">
      <div className="flex flex-wrap justify-between gap-3"><div><span className="text-xs text-gray-500">{order.orderNumber}</span><h2 className="font-bold">{order.serviceTitle}</h2>
        <p className="text-sm text-gray-600">{tab === "buying" ? `Seller: ${order.seller.fullName || order.seller.username}` : `Buyer: ${order.buyer.fullName || order.buyer.username}`}</p></div>
        <div className="text-right"><Badge>{order.status}</Badge><p className="mt-2 font-bold">{formatMoney(order.priceAmount, order.currencyCode)}</p></div></div>
      <div className="mt-4 flex flex-wrap justify-between text-sm text-gray-500"><span>{order.packageTier} · revisions {order.usedRevisionCount}/{order.includedRevisionCount}</span><span>Updated {formatMarketplaceDate(order.updatedAt)}</span>{order.deliveryDueAt && <span>Due {formatMarketplaceDate(order.deliveryDueAt)}</span>}</div>
    </Card></Link>)}</div>
    {result && <nav aria-label="Order pagination" className="flex justify-center gap-3"><Button variant="secondary" disabled={result.first} onClick={() => go({ page: String(page-1) })}>Previous</Button><span className="self-center">Page {page+1}</span><Button variant="secondary" disabled={result.last} onClick={() => go({ page: String(page+1) })}>Next</Button></nav>}
  </main>;
}
export default function FreelanceOrdersPage() { return <Suspense><Content /></Suspense>; }
