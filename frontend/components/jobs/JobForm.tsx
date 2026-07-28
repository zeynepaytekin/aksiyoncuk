"use client";

import { type FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import FormActions from "@/components/ui/FormActions";
import FormError from "@/components/ui/FormError";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import TextArea from "@/components/ui/TextArea";
import { COMPENSATION_TYPES, JOB_CATEGORIES, WORK_MODES } from "@/constants/jobs";
import type {
  CompensationType, CreateJobRequest, Job, JobCategory, UpdateJobRequest, WorkMode,
} from "@/types/jobs";

export default function JobForm({ initial, saving, error, onCancel, onCreate, onUpdate }: {
  initial?: Job; saving: boolean; error: string; onCancel: () => void;
  onCreate?: (request: CreateJobRequest) => Promise<void>;
  onUpdate?: (request: UpdateJobRequest) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<JobCategory>(initial?.category ?? "PROFESSIONAL");
  const [workMode, setWorkMode] = useState<WorkMode>(initial?.workMode ?? "REMOTE");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [type, setType] = useState<CompensationType>(initial?.compensationType ?? "UNPAID");
  const [amount, setAmount] = useState(initial?.compensationAmount?.toString() ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "");
  const [deadline, setDeadline] = useState(initial?.applicationDeadline?.slice(0, 16) ?? "");
  const [validation, setValidation] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setValidation("");
    const normalizedTitle = title.trim(); const normalizedDescription = description.trim();
    const normalizedLocation = location.trim() || null;
    const normalizedCurrency = currency.trim().toUpperCase() || null;
    const normalizedAmount = amount.trim() ? Number(amount) : null;
    const normalizedDeadline = deadline ? new Date(deadline).toISOString() : null;
    if (!normalizedTitle || normalizedTitle.length > 200) return setValidation("Title is required and must not exceed 200 characters.");
    if (!normalizedDescription || normalizedDescription.length > 5000) return setValidation("Description is required and must not exceed 5000 characters.");
    if (normalizedLocation && normalizedLocation.length > 150) return setValidation("Location must not exceed 150 characters.");
    if (normalizedCurrency && !/^[A-Z]{3}$/.test(normalizedCurrency)) return setValidation("Currency must be three letters.");
    if (type === "FIXED" && (!(normalizedAmount && normalizedAmount > 0) || !normalizedCurrency))
      return setValidation("Fixed compensation requires a positive amount and currency.");
    if (type === "UNPAID" && (normalizedAmount !== null || normalizedCurrency !== null))
      return setValidation("Unpaid listings cannot include an amount or currency.");
    if (normalizedAmount !== null && normalizedAmount <= 0) return setValidation("Compensation amount must be positive.");
    if (normalizedDeadline && new Date(normalizedDeadline) <= new Date()) return setValidation("Deadline must be in the future.");
    const request: CreateJobRequest = {
      title: normalizedTitle, description: normalizedDescription, category, workMode,
      location: normalizedLocation, compensationType: type,
      compensationAmount: type === "UNPAID" ? null : normalizedAmount,
      currency: type === "UNPAID" ? null : normalizedCurrency,
      applicationDeadline: normalizedDeadline,
    };
    if (!initial && onCreate) return onCreate(request);
    if (initial && onUpdate) {
      const update: UpdateJobRequest = {};
      for (const key of Object.keys(request) as (keyof CreateJobRequest)[]) {
        if (request[key] !== initial[key]) Object.assign(update, { [key]: request[key] });
      }
      return onUpdate(update);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <FormField label="Title" htmlFor="job-title"><Input id="job-title" value={title}
        onChange={(e) => setTitle(e.target.value)} maxLength={200} disabled={saving} /></FormField>
      <FormField label="Description" htmlFor="job-description"><TextArea id="job-description"
        value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} disabled={saving} /></FormField>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Category" htmlFor="job-category"><select id="job-category" value={category}
          onChange={(e) => setCategory(e.target.value as JobCategory)} disabled={saving}
          className="w-full rounded-xl border border-gray-300 px-4 py-3">
          {JOB_CATEGORIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
        </select></FormField>
        <FormField label="Work mode" htmlFor="job-mode"><select id="job-mode" value={workMode}
          onChange={(e) => setWorkMode(e.target.value as WorkMode)} disabled={saving}
          className="w-full rounded-xl border border-gray-300 px-4 py-3">
          {WORK_MODES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
        </select></FormField>
      </div>
      <FormField label="Location" htmlFor="job-location"><Input id="job-location" value={location}
        onChange={(e) => setLocation(e.target.value)} maxLength={150} disabled={saving} /></FormField>
      <FormField label="Compensation" htmlFor="job-compensation"><select id="job-compensation" value={type}
        onChange={(e) => { const value=e.target.value as CompensationType; setType(value);
          if (value === "UNPAID") { setAmount(""); setCurrency(""); } }} disabled={saving}
        className="w-full rounded-xl border border-gray-300 px-4 py-3">
        {COMPENSATION_TYPES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
      </select></FormField>
      {type !== "UNPAID" && <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Amount" htmlFor="job-amount"><Input id="job-amount" type="number" min="0.01"
          step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={saving} /></FormField>
        <FormField label="Currency" htmlFor="job-currency"><Input id="job-currency" maxLength={3}
          value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} disabled={saving} /></FormField>
      </div>}
      <FormField label="Application deadline" htmlFor="job-deadline"><Input id="job-deadline"
        type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={saving} /></FormField>
      {(validation || error) && <div role="alert"><FormError message={validation || error} /></div>}
      <FormActions><Button variant="secondary" size="lg" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" size="lg" isLoading={saving} loadingText="Saving...">Save Job</Button></FormActions>
    </form>
  );
}
