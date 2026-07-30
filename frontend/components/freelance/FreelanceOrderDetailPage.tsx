"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { freelanceService } from "@/services/api/freelance.service";
import { freelanceErrorMessage } from "@/services/api/freelanceErrorMessage";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useFreelanceStore } from "@/store/freelance.store";
import { formatMarketplaceDate, formatMoney } from "@/utils/formatFreelance";
import {
  readableFileSize,
  safeDownloadFilename,
  validateDeliveryAttachments,
} from "@/utils/freelanceDeliveryAttachments";
import FreelanceCancellationHistory from "./FreelanceCancellationHistory";
type Dialog = "deliver" | "revision" | "cancel" | "reject" | "review" | null;
function Content() {
  const params = useSearchParams(), router = useRouter(), id = params.get("order") ?? "", { user, isLoading } = useRequireAuth(), store = useFreelanceStore();
  const loadOrder = useFreelanceStore((state) => state.loadOrder);
  const [dialog, setDialog] = useState<Dialog>(null), [text, setText] = useState(""), [rating, setRating] = useState(5), [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  useEffect(() => { if (user && id) void loadOrder(id).catch(() => undefined); }, [user, id, loadOrder]);
  if (isLoading || !user) return <main className="p-8">Loading…</main>;
  const order = store.selectedOrder?.id === id ? store.selectedOrder : null;
  if (!id || (!order && store.orderStatus !== "loading")) return <main className="p-8"><h1 className="text-2xl font-bold">Order unavailable</h1><p>{freelanceErrorMessage(store.orderError)}</p></main>;
  if (!order) return <main className="p-8">Loading order…</main>;
  const currentOrder = order;
  const buyer = user.id === order.buyer.id, seller = user.id === order.seller.id;
  const pending = store.mutations[`order:${order.id}`] === "loading" || store.mutations[`review:${order.id}`] === "loading";
  const revision = order.revisions.find((r) => !r.acknowledgedAt);
  async function run(request: () => Promise<typeof currentOrder>) {
    setError(""); try { await store.runOrderAction(`order:${currentOrder.id}`, request); setDialog(null); setText(""); return true; }
    catch (e) { setError(freelanceErrorMessage(e)); if ((e as { status?: number }).status === 409) void store.loadOrder(currentOrder.id).catch(() => undefined); return false; }
  }
  async function contact() { const conversation = await freelanceService.openServiceConversation(currentOrder.serviceId); router.push(`/messages?conversation=${conversation.id}`); }
  async function download(deliveryId: string, attachmentId: string, filename: string) {
    setDownloading(attachmentId); setError("");
    try {
      const result = await freelanceService.downloadDeliveryAttachment(currentOrder.id, deliveryId, attachmentId);
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeDownloadFilename(result.contentDisposition, filename);
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      URL.revokeObjectURL(url);
    } catch (cause) { setError(freelanceErrorMessage(cause)); }
    finally { setDownloading(null); }
  }
  const cancellation = order.pendingCancellation, requester = cancellation?.requestedRole === (buyer ? "BUYER" : "SELLER");
  return <main className="mx-auto min-w-0 max-w-5xl space-y-6 overflow-x-hidden px-4 py-8"><header className="flex flex-wrap justify-between gap-4"><div className="min-w-0"><span className="break-all text-sm text-gray-500">{order.orderNumber}</span><h1 className="break-words text-2xl font-bold sm:text-3xl">{order.serviceTitle}</h1><p>{buyer ? `Seller: ${order.seller.fullName || order.seller.username}` : `Buyer: ${order.buyer.fullName || order.buyer.username}`}</p></div><Badge>{order.status}</Badge></header>
    <Card><h2 className="text-xl font-bold">Package snapshot</h2><div className="mt-3 grid gap-2 sm:grid-cols-3"><p><strong>{order.packageTier}: {order.packageName}</strong><br />{order.packageDescription}</p><p>{formatMoney(order.priceAmount, order.currencyCode)}<br />{order.deliveryDays} days</p><p>Revisions {order.usedRevisionCount}/{order.includedRevisionCount}<br />Due: {formatMarketplaceDate(order.deliveryDueAt)}</p></div>
      <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm font-medium">This order is not a paid status. No payment is processed in this phase.</p></Card>
    <Card><h2 className="text-xl font-bold">Buyer requirements</h2><p className="mt-2 whitespace-pre-wrap">{order.buyerRequirements}</p></Card>
    <section><h2 className="text-xl font-bold">Timeline</h2><div className="mt-3 space-y-3 border-l-2 pl-5"><p>Created · {formatMarketplaceDate(order.createdAt)}</p>{order.startedAt && <p>Started · {formatMarketplaceDate(order.startedAt)}</p>}
      {order.deliveries.map((delivery, index) => <Card key={delivery.id}><strong>Delivery {index + 1} · {formatMarketplaceDate(delivery.createdAt)}</strong><p className="mt-2 whitespace-pre-wrap">{delivery.message}</p>
        {delivery.attachments.length > 0 && <ul className="mt-3 space-y-2" aria-label={`Delivery ${index + 1} attachments`}>{delivery.attachments.map((attachment) => <li key={attachment.id} className="flex min-w-0 flex-col gap-2 rounded-lg bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"><span className="min-w-0 break-all text-sm"><strong>{attachment.filename}</strong><br />{attachment.contentType} · {readableFileSize(attachment.sizeBytes)}</span><Button variant="secondary" isLoading={downloading === attachment.id} disabled={downloading === attachment.id} aria-label={`Download ${attachment.filename}`} onClick={() => void download(delivery.id, attachment.id, attachment.filename)}>Download</Button></li>)}</ul>}
      </Card>)}
      {order.revisions.map((item) => <Card key={item.id}><strong>Revision {item.sequenceNumber} · {formatMarketplaceDate(item.createdAt)}</strong><p>{item.reason}</p><small>{item.acknowledgedAt ? `Acknowledged ${formatMarketplaceDate(item.acknowledgedAt)}` : "Awaiting acknowledgement"}</small></Card>)}
      <FreelanceCancellationHistory requests={order.cancellationHistory} />
      {order.completedAt && <p>Completed · {formatMarketplaceDate(order.completedAt)}</p>}{order.cancelledAt && <p>Cancelled · {formatMarketplaceDate(order.cancelledAt)}</p>}</div></section>
    {cancellation && <Card><h2 className="text-xl font-bold">Pending cancellation</h2><p className="mt-2">{cancellation.requestedRole} requested: {cancellation.reason}</p><p className="text-sm text-gray-500">Previous status: {cancellation.previousOrderStatus}</p>
      <p className="mt-3 text-sm font-medium">This action changes the order status only. No payment or refund is processed.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row">{requester ? <Button variant="secondary" isLoading={pending} onClick={() => void run(() => freelanceService.withdrawCancellation(order.id, cancellation.id))}>Withdraw request</Button> : <>
        <Button onClick={() => confirm("Accept cancellation and cancel this order?") && void run(() => freelanceService.acceptCancellation(order.id, cancellation.id))}>Accept</Button><Button variant="secondary" onClick={() => void run(() => freelanceService.rejectCancellation(order.id, cancellation.id))}>Reject</Button></>}</div></Card>}
    {order.status !== "COMPLETED" && order.status !== "CANCELLED" && <Card><h2 className="text-xl font-bold">Available actions</h2><div className="mt-4 flex flex-wrap gap-2">
      {seller && order.status === "CREATED" && <><Button onClick={() => void run(() => freelanceService.startOrder(order.id))}>Start order</Button><Button variant="secondary" onClick={() => setDialog("reject")}>Reject</Button></>}
      {seller && order.status === "IN_PROGRESS" && <Button onClick={() => setDialog("deliver")}>Submit delivery</Button>}
      {seller && order.status === "REVISION_REQUESTED" && revision && <Button onClick={() => confirm("Acknowledge this revision and resume work?") && void run(() => freelanceService.acknowledgeRevision(order.id, revision.id))}>Acknowledge revision</Button>}
      {buyer && order.status === "DELIVERED" && <><Button onClick={() => confirm("Complete this order? It will become review-eligible and read-only.") && void run(() => freelanceService.completeOrder(order.id))}>Complete order</Button>
        {order.usedRevisionCount < order.includedRevisionCount && <Button variant="secondary" onClick={() => setDialog("revision")}>Request revision</Button>}</>}
      {!cancellation && ["CREATED","IN_PROGRESS","DELIVERED","REVISION_REQUESTED"].includes(order.status) && <Button variant="ghost" onClick={() => setDialog("cancel")}>Request cancellation</Button>}
      <Button variant="secondary" onClick={() => void contact()}>Message {buyer ? "seller" : "buyer"}</Button></div></Card>}
    {buyer && order.status === "COMPLETED" && order.reviewEligible && <Button onClick={() => setDialog("review")}>Write a review</Button>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
    <Modal isOpen={dialog !== null} onClose={() => setDialog(null)} title={dialog === "deliver" ? "Submit delivery" : dialog === "revision" ? "Request revision" : dialog === "cancel" ? "Request cancellation" : dialog === "review" ? "Review service" : "Reject order"}
      description={dialog === "cancel" ? "This changes order status only. No payment or refund is processed." : undefined}
      footer={<><Button variant="secondary" onClick={() => setDialog(null)}>Close</Button><Button disabled={dialog !== "review" && !text.trim()} isLoading={pending} onClick={() => {
        if (dialog === "deliver") void run(() => freelanceService.deliverOrder(order.id, { message: text, files })).then((success) => { if (success) { setFiles([]); setFileError(""); } });
        if (dialog === "revision") void run(() => freelanceService.requestRevision(order.id, { reason: text }));
        if (dialog === "cancel") void run(() => freelanceService.requestCancellation(order.id, { reason: text }));
        if (dialog === "reject") void run(() => freelanceService.rejectOrder(order.id, { reason: text }));
        if (dialog === "review") void store.createReview(order.id, { rating, comment: text.trim() || null }).then(() => setDialog(null)).catch((e) => setError(freelanceErrorMessage(e)));
      }}>Confirm</Button></>}>
      {dialog === "review" && <fieldset className="mb-4"><legend className="font-semibold">Rating</legend><div className="flex gap-3">{[1,2,3,4,5].map((value) => <label key={value}><input type="radio" name="rating" checked={rating === value} onChange={() => setRating(value)} /> {value}</label>)}</div></fieldset>}
      <label htmlFor="order-action-text" className="block font-semibold">{dialog === "deliver" ? "Delivery message" : dialog === "review" ? "Comment (optional)" : "Reason"}</label><textarea id="order-action-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={5000} className="mt-2 min-h-32 w-full rounded-xl border p-3" />
      {dialog === "deliver" && <div className="mt-4"><label htmlFor="delivery-attachments" className="block font-semibold">Attachments (optional)</label><p id="delivery-attachment-help" className="text-sm text-gray-600">Up to 5 JPEG, PNG, WebP, PDF, text, or ZIP files; 25 MB each and 75 MB total. Files are private to order participants.</p><input id="delivery-attachments" className="mt-2 block w-full text-sm" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.zip,image/jpeg,image/png,image/webp,application/pdf,text/plain,application/zip" aria-describedby="delivery-attachment-help delivery-attachment-error" onChange={(event) => { const next = [...files, ...Array.from(event.target.files ?? [])]; const issue = validateDeliveryAttachments(next); setFileError(issue ?? ""); if (!issue) setFiles(next); event.target.value = ""; }} />
        <p id="delivery-attachment-error" role="alert" aria-live="polite" className="mt-2 text-sm text-red-700">{fileError}</p>
        <ul className="mt-2 space-y-2">{files.map((file, index) => <li key={`${file.name}-${file.size}-${index}`} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-gray-50 p-2"><span className="min-w-0 break-all text-sm">{file.name} · {readableFileSize(file.size)}</span><Button variant="ghost" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button></li>)}</ul>
      </div>}
      {dialog === "revision" && <p className="mt-2 text-sm">{order.includedRevisionCount - order.usedRevisionCount} included revision(s) remaining.</p>}
    </Modal>
  </main>;
}
export default function FreelanceOrderDetailPage() { return <Suspense><Content /></Suspense>; }
