"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import TextArea from "@/components/ui/TextArea";
import { freelanceService } from "@/services/api/freelance.service";
import { freelanceErrorMessage } from "@/services/api/freelanceErrorMessage";
import { useAuthStore } from "@/store/auth.store";
import { useFreelanceStore } from "@/store/freelance.store";
import { formatMarketplaceDate, formatMoney } from "@/utils/formatFreelance";

function Content() {
  const router = useRouter(), params = useSearchParams(), serviceId = params.get("service")?.trim() ?? "";
  const user = useAuthStore((s) => s.user);
  const { selectedService: service, serviceStatus, serviceError, reviews, loadService, loadReviews, createOrder, publishService, pauseService, archiveService } = useFreelanceStore();
  const [packageId, setPackageId] = useState(""), [requirements, setRequirements] = useState("");
  const [dialog, setDialog] = useState(false), [message, setMessage] = useState(""), [pending, setPending] = useState(false);
  useEffect(() => { if (serviceId) { void loadService(serviceId).catch(() => undefined); void loadReviews(serviceId).catch(() => undefined); } }, [serviceId, loadService, loadReviews]);
  if (!serviceId) return <main className="mx-auto max-w-4xl p-8"><h1 className="text-2xl font-bold">Service unavailable</h1><p>A service identifier is required.</p></main>;
  if (!service && serviceStatus === "loading") return <main className="p-8" aria-live="polite">Loading service…</main>;
  if (!service) return <main className="mx-auto max-w-4xl p-8"><h1 className="text-2xl font-bold">Service not found</h1><p>{freelanceErrorMessage(serviceError)}</p></main>;
  const currentService = service;
  const owner = user?.id === service.seller.id;
  async function order() {
    if (!user) { router.push("/login"); return; }
    setPending(true); setMessage("");
    try {
      const created = await createOrder({ serviceId: currentService.id, packageId, requirements });
      router.push(`/freelance/order?order=${encodeURIComponent(created.id)}`);
    } catch (e) { setMessage(freelanceErrorMessage(e)); } finally { setPending(false); }
  }
  async function contact() {
    if (!user) { router.push("/login"); return; }
    setPending(true);
    try { const conversation = await freelanceService.openServiceConversation(currentService.id); router.push(`/messages?conversation=${encodeURIComponent(conversation.id)}`); }
    catch (e) { setMessage(freelanceErrorMessage(e)); } finally { setPending(false); }
  }
  return <main className="mx-auto max-w-7xl px-4 py-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <Link href="/freelance" className="text-sm font-medium">← Marketplace</Link>
      {owner && <div className="flex gap-2"><Link href={`/freelance/manage?service=${service.id}`} className="rounded-xl border px-4 py-2 text-sm font-semibold">Manage listing</Link>
        {service.status !== "PUBLISHED" && service.status !== "ARCHIVED" && <Button onClick={() => void publishService(service.id)}>Publish</Button>}
        {service.status === "PUBLISHED" && <Button variant="secondary" onClick={() => void pauseService(service.id)}>Pause</Button>}
        {service.status !== "ARCHIVED" && <Button variant="ghost" onClick={() => confirm("Archive this listing? Archived listings are immutable.") && void archiveService(service.id)}>Archive</Button>}</div>}
    </div>
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <article className="space-y-8">
        <header><div className="flex gap-2"><Badge>{service.category.name}</Badge>{owner && <Badge>{service.status}</Badge>}</div>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{service.title}</h1><p className="mt-3 text-lg text-gray-600">{service.shortDescription}</p></header>
        <section aria-label="Service images" className="grid gap-3 sm:grid-cols-2">
          {service.media.length ? service.media.map((media) => <div key={media.id} className="relative aspect-video overflow-hidden rounded-2xl bg-gray-100">
            <Image src={media.url} alt={`${service.title} image ${media.displayOrder + 1}`} fill className="object-cover" /></div>)
            : <div className="flex aspect-video items-center justify-center rounded-2xl bg-gray-100 text-gray-400">No listing images</div>}
        </section>
        <section><h2 className="text-2xl font-bold">About this service</h2><p className="mt-3 whitespace-pre-wrap leading-7 text-gray-700">{service.description}</p></section>
        <section><h2 className="text-2xl font-bold">Portfolio works</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">
          {service.works.length ? service.works.map((work) => <Link key={work.id} href={`/works/view?work=${work.id}`}><Card>{work.title}</Card></Link>) : <p className="text-gray-500">No portfolio works linked.</p>}</div></section>
        <section><h2 className="text-2xl font-bold">Reviews</h2><div className="mt-3 space-y-3">
          {reviews?.content.map((review) => <Card key={review.id}><div className="flex justify-between"><strong>{review.reviewer.fullName || review.reviewer.username}</strong><span aria-label={`${review.rating} out of 5`}>★ {review.rating}/5</span></div>
            {review.comment && <p className="mt-2 text-gray-700">{review.comment}</p>}<p className="mt-2 text-xs text-gray-500">{formatMarketplaceDate(review.createdAt)}</p></Card>)}
          {reviews?.content.length === 0 && <p className="text-gray-500">No reviews yet.</p>}</div></section>
      </article>
      <aside className="space-y-5">
        <Card><div className="flex items-center gap-3"><Avatar src={service.seller.avatarUrl ?? undefined} alt={service.seller.fullName || service.seller.username} fallback={(service.seller.fullName || service.seller.username).slice(0, 1)} />
          <div><strong>{service.seller.fullName || service.seller.username}</strong><p className="text-sm text-gray-500">{service.seller.professionalTitle}</p></div></div>
          {!owner && <Button className="mt-4 w-full" variant="secondary" onClick={() => void contact()} isLoading={pending}>Contact seller</Button>}</Card>
        <div className="space-y-3" role="radiogroup" aria-label="Select a service package">
          {service.packages.filter((p) => p.active).map((pkg) => <label key={pkg.id} className={`block cursor-pointer rounded-2xl border p-5 ${packageId === pkg.id ? "border-black ring-1 ring-black" : "border-gray-200"}`}>
            <input type="radio" name="package" value={pkg.id} checked={packageId === pkg.id} onChange={() => setPackageId(pkg.id)} className="mr-2" />
            <strong>{pkg.tier}: {pkg.name}</strong><p className="mt-2 text-sm text-gray-600">{pkg.description}</p>
            <div className="mt-4 flex justify-between"><span>{pkg.deliveryDays} days · {pkg.revisionCount} revisions</span><strong>{formatMoney(pkg.priceAmount, pkg.currencyCode)}</strong></div>
          </label>)}
        </div>
        {!owner && <Button className="w-full" disabled={!packageId} onClick={() => user ? setDialog(true) : router.push("/login")}>Create order request</Button>}
        <p className="text-center text-sm font-medium text-gray-600">No payment is processed at this stage.</p>
        {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
      </aside>
    </div>
    <Modal isOpen={dialog} onClose={() => setDialog(false)} title="Create order request"
      description="The seller must start the order before work begins. No payment is processed in this phase."
      footer={<><Button variant="secondary" onClick={() => setDialog(false)}>Cancel</Button><Button onClick={() => void order()} isLoading={pending} disabled={!requirements.trim()}>Create order request</Button></>}>
      <label htmlFor="order-requirements" className="mb-2 block text-sm font-semibold">Buyer requirements</label>
      <TextArea id="order-requirements" value={requirements} onChange={(e) => setRequirements(e.target.value)} maxLength={5000} rows={7} />
      <p className="mt-2 text-xs text-gray-500">{requirements.length}/5000 characters</p>
    </Modal>
  </main>;
}
export default function FreelanceServiceDetailPage() { return <Suspense><Content /></Suspense>; }
