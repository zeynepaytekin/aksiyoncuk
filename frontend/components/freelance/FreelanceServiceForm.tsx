"use client";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ImageFilePicker from "@/components/media/ImageFilePicker";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { freelanceService } from "@/services/api/freelance.service";
import { freelanceErrorMessage } from "@/services/api/freelanceErrorMessage";
import { useFreelanceStore } from "@/store/freelance.store";
import { useWorksStore } from "@/store/works.store";
import type { FreelancePackageRequest, FreelancePackageTier } from "@/types/freelance";

const emptyPackage = (tier: FreelancePackageTier): FreelancePackageRequest => ({
  tier, name: "", description: "", priceAmount: "", currencyCode: "TRY", deliveryDays: 1, revisionCount: 0, active: true,
});
function Content({ create = false }: { create?: boolean }) {
  const router = useRouter(), params = useSearchParams(), id = create ? "" : params.get("service") ?? "";
  const { user, isLoading } = useRequireAuth(), store = useFreelanceStore(), works = useWorksStore();
  const loadCategories = useFreelanceStore((state) => state.loadCategories);
  const loadService = useFreelanceStore((state) => state.loadService);
  const loadMyWorks = useWorksStore((state) => state.loadMyWorks);
  const [categoryId, setCategoryId] = useState(""), [title, setTitle] = useState(""), [shortDescription, setShort] = useState("");
  const [description, setDescription] = useState(""), [languageCode, setLanguage] = useState("tr");
  const [packages, setPackages] = useState<FreelancePackageRequest[]>([emptyPackage("BASIC")]);
  const [workIds, setWorkIds] = useState<string[]>([]), [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState(""), [saving, setSaving] = useState(false), [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!user) return;
    void loadCategories().catch(() => undefined);
    void loadMyWorks({ size: 50 }).catch(() => undefined);
    if (id) void loadService(id).catch(() => undefined);
  }, [user, id, loadCategories, loadMyWorks, loadService]);
  /* The backend response initializes an editable draft exactly once. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { const s = store.selectedService; if (!create && s?.id === id && !hydrated) {
    setCategoryId(s.category.id); setTitle(s.title); setShort(s.shortDescription); setDescription(s.description); setLanguage(s.languageCode);
    setPackages(s.packages.map(({ tier, name, description: detail, priceAmount, currencyCode, deliveryDays, revisionCount, active }) =>
      ({ tier, name, description: detail, priceAmount: String(priceAmount), currencyCode, deliveryDays, revisionCount, active })));
    setWorkIds(s.works.map((work) => work.id)); setHydrated(true);
  } }, [store.selectedService, id, create, hydrated]);
  /* eslint-enable react-hooks/set-state-in-effect */
  if (isLoading || !user) return <main className="p-8">Loading…</main>;
  const service = store.selectedService?.id === id ? store.selectedService : null;
  function updatePackage(index: number, field: keyof FreelancePackageRequest, value: string | number | boolean) {
    setPackages((current) => current.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }
  async function submit(event: FormEvent, publish = false) {
    event.preventDefault(); setError("");
    if (!categoryId || !title.trim() || !shortDescription.trim() || !description.trim()) return setError("Complete all basic listing fields.");
    if (!packages.length || packages.some((p) => !p.name.trim() || !p.description.trim() || !/^\d+(\.\d{1,2})?$/.test(p.priceAmount) || Number(p.priceAmount) <= 0)) return setError("Complete every package with a valid positive price.");
    if (new Set(packages.map((p) => p.tier)).size !== packages.length) return setError("Package tiers must be unique.");
    setSaving(true);
    try {
      const body = { categoryId, title: title.trim(), shortDescription: shortDescription.trim(), description: description.trim(), languageCode, packages, workIds };
      let result = id ? await store.updateService(id, body) : await store.createService(body);
      for (const file of files) await freelanceService.uploadServiceImage(result.id, file);
      if (files.length) { await store.loadService(result.id); result = useFreelanceStore.getState().selectedService ?? result; setFiles([]); }
      if (publish) result = await store.publishService(result.id);
      router.push(publish ? `/freelance/service?service=${result.id}` : `/freelance/manage?service=${result.id}`);
    } catch (e) { setError(freelanceErrorMessage(e)); } finally { setSaving(false); }
  }
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8"><header><h1 className="text-3xl font-bold">{create ? "Create service" : "Manage service"}</h1><p className="text-gray-600">Build a clear listing with up to three packages, six works, and eight images.</p></header>
    {service?.status === "ARCHIVED" && <p role="alert" className="rounded-xl bg-amber-50 p-4">This archived listing is immutable.</p>}
    <form onSubmit={(e) => void submit(e)} className="space-y-6">
      <Card as="section"><h2 className="text-xl font-bold">1. Basic information</h2><div className="mt-4 grid gap-4">
        <label>Category<select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="">Select category</option>{store.categories.flatMap((c) => [c, ...c.children]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Title<input required minLength={10} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border p-3" /></label>
        <label>Short description<input required minLength={20} maxLength={300} value={shortDescription} onChange={(e) => setShort(e.target.value)} className="mt-1 w-full rounded-xl border p-3" /></label>
        <label>Description<textarea required minLength={50} maxLength={10000} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 min-h-40 w-full rounded-xl border p-3" /></label>
        <label>Language code<input required maxLength={10} value={languageCode} onChange={(e) => setLanguage(e.target.value)} className="mt-1 w-32 rounded-xl border p-3" /></label>
      </div></Card>
      <Card as="section"><div className="flex justify-between"><h2 className="text-xl font-bold">2. Packages</h2><Button variant="secondary" disabled={packages.length >= 3} onClick={() => setPackages((p) => [...p, emptyPackage((["BASIC","STANDARD","PREMIUM"] as FreelancePackageTier[]).find((t) => !p.some((x) => x.tier === t)) ?? "PREMIUM")])}>Add package</Button></div>
        <div className="mt-4 space-y-4">{packages.map((pkg, index) => <fieldset key={`${pkg.tier}-${index}`} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"><legend className="px-2 font-bold">Package {index + 1}</legend>
          <label>Tier<select value={pkg.tier} onChange={(e) => updatePackage(index, "tier", e.target.value)} className="mt-1 w-full rounded-lg border p-2"><option>BASIC</option><option>STANDARD</option><option>PREMIUM</option></select></label>
          <label>Name<input value={pkg.name} maxLength={80} onChange={(e) => updatePackage(index, "name", e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
          <label className="sm:col-span-2">Description<textarea value={pkg.description} maxLength={2000} onChange={(e) => updatePackage(index, "description", e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
          <label>Price (TRY)<input inputMode="decimal" value={pkg.priceAmount} onChange={(e) => updatePackage(index, "priceAmount", e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
          <label>Delivery days<input type="number" min="1" max="365" value={pkg.deliveryDays} onChange={(e) => updatePackage(index, "deliveryDays", Number(e.target.value))} className="mt-1 w-full rounded-lg border p-2" /></label>
          <label>Included revisions<input type="number" min="0" max="20" value={pkg.revisionCount} onChange={(e) => updatePackage(index, "revisionCount", Number(e.target.value))} className="mt-1 w-full rounded-lg border p-2" /></label>
          <Button variant="ghost" onClick={() => setPackages((p) => p.filter((_, i) => i !== index))} disabled={packages.length === 1}>Remove package</Button>
        </fieldset>)}</div></Card>
      <Card as="section"><h2 className="text-xl font-bold">3. Portfolio works</h2><p className="text-sm text-gray-500">Only your own works are eligible. Select up to six; selection order is preserved.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">{works.myWorks.map((work) => <label key={work.id} className="rounded-xl border p-3"><input type="checkbox" checked={workIds.includes(work.id)} disabled={!workIds.includes(work.id) && workIds.length >= 6}
          onChange={(e) => setWorkIds((ids) => e.target.checked ? [...ids, work.id] : ids.filter((value) => value !== work.id))} className="mr-2" />{work.title}</label>)}</div></Card>
      <Card as="section"><h2 className="text-xl font-bold">4. Images</h2><p className="mb-4 text-sm text-gray-500">JPEG, PNG or WebP · 15 MB each · maximum eight. The first image is the thumbnail.</p>
        {service?.media.length ? <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{service.media.map((media, index) => <div key={media.id}><div className="relative aspect-video"><Image src={media.url} alt={`Listing image ${index + 1}`} fill className="rounded-lg object-cover" /></div>
          <div className="mt-1 flex gap-1"><Button size="sm" variant="secondary" disabled={index === 0} aria-label={`Move image ${index + 1} left`} onClick={() => { const ids = service.media.map((m) => m.id); [ids[index-1], ids[index]] = [ids[index], ids[index-1]]; void freelanceService.reorderServiceImages(service.id, ids).then(() => store.loadService(service.id)); }}>←</Button>
          <Button size="sm" variant="ghost" onClick={() => confirm("Delete this listing image?") && void freelanceService.deleteServiceImage(service.id, media.id).then(() => store.loadService(service.id))}>Delete</Button></div></div>)}</div> : null}
        <ImageFilePicker purpose="freelance" files={files} onChange={setFiles} maximum={Math.max(0, 8 - (service?.media.length ?? 0))} /></Card>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      <div aria-live="polite" className="flex flex-wrap justify-end gap-3"><Button variant="secondary" type="submit" isLoading={saving}>Save draft</Button><Button onClick={(e) => void submit(e, true)} isLoading={saving}>Save and publish</Button></div>
    </form>
  </main>;
}
export default function FreelanceServiceForm(props: { create?: boolean }) { return <Suspense><Content {...props} /></Suspense>; }
