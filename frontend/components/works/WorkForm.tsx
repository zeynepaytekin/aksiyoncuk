"use client";

import { type FormEvent, useState } from "react";

import Button from "@/components/ui/Button";
import FormActions from "@/components/ui/FormActions";
import FormError from "@/components/ui/FormError";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import TextArea from "@/components/ui/TextArea";
import { WORK_TYPES } from "@/constants/works";
import type {
  CreateWorkRequest,
  UpdateWorkRequest,
  Work,
  WorkType,
} from "@/types/works";

type Props = {
  initial?: Work;
  isSaving: boolean;
  error: string;
  onCancel: () => void;
  onCreate?: (request: CreateWorkRequest) => Promise<void>;
  onUpdate?: (request: UpdateWorkRequest) => Promise<void>;
};

const maximumYear = new Date().getUTCFullYear() + 5;

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export default function WorkForm({
  initial,
  isSaving,
  error,
  onCancel,
  onCreate,
  onUpdate,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [workType, setWorkType] = useState<WorkType>(
    initial?.workType ?? "FILM",
  );
  const [projectUrl, setProjectUrl] = useState(initial?.projectUrl ?? "");
  const [releaseYear, setReleaseYear] = useState(
    initial?.releaseYear?.toString() ?? "",
  );
  const [validationError, setValidationError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");
    const normalizedTitle = title.trim();
    const normalizedDescription = nullable(description);
    const normalizedUrl = nullable(projectUrl);
    const normalizedYear = releaseYear.trim() ? Number(releaseYear) : null;

    if (!normalizedTitle || normalizedTitle.length > 200) {
      setValidationError("Title is required and must not exceed 200 characters.");
      return;
    }
    if (description.trim().length > 5000) {
      setValidationError("Description must not exceed 5000 characters.");
      return;
    }
    if (normalizedUrl) {
      try {
        const url = new URL(normalizedUrl);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      } catch {
        setValidationError("Project URL must be an absolute HTTP or HTTPS URL.");
        return;
      }
    }
    if (
      normalizedUrl &&
      normalizedUrl.length > 500
    ) {
      setValidationError("Project URL must not exceed 500 characters.");
      return;
    }
    if (
      normalizedYear !== null &&
      (!Number.isInteger(normalizedYear) ||
        normalizedYear < 1888 ||
        normalizedYear > maximumYear)
    ) {
      setValidationError(
        `Release year must be between 1888 and ${maximumYear}.`,
      );
      return;
    }

    if (!initial && onCreate) {
      await onCreate({
        title: normalizedTitle,
        description: normalizedDescription,
        workType,
        projectUrl: normalizedUrl,
        releaseYear: normalizedYear,
      });
      return;
    }
    if (initial && onUpdate) {
      const request: UpdateWorkRequest = {};
      if (normalizedTitle !== initial.title) request.title = normalizedTitle;
      if (normalizedDescription !== initial.description)
        request.description = normalizedDescription;
      if (workType !== initial.workType) request.workType = workType;
      if (normalizedUrl !== initial.projectUrl)
        request.projectUrl = normalizedUrl;
      if (normalizedYear !== initial.releaseYear)
        request.releaseYear = normalizedYear;
      await onUpdate(request);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <FormField label="Title" htmlFor="work-title">
        <Input
          id="work-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          disabled={isSaving}
          required
        />
      </FormField>
      <FormField label="Type" htmlFor="work-type">
        <select
          id="work-type"
          value={workType}
          onChange={(event) => setWorkType(event.target.value as WorkType)}
          disabled={isSaving}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
        >
          {WORK_TYPES.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Description" htmlFor="work-description">
        <TextArea
          id="work-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={5000}
          disabled={isSaving}
        />
      </FormField>
      <FormField label="Project URL" htmlFor="work-url">
        <Input
          id="work-url"
          type="url"
          value={projectUrl}
          onChange={(event) => setProjectUrl(event.target.value)}
          maxLength={500}
          placeholder="https://example.com/project"
          disabled={isSaving}
        />
      </FormField>
      <FormField label="Release year" htmlFor="work-year">
        <Input
          id="work-year"
          type="number"
          min={1888}
          max={maximumYear}
          value={releaseYear}
          onChange={(event) => setReleaseYear(event.target.value)}
          disabled={isSaving}
        />
      </FormField>
      {(validationError || error) && (
        <div role="alert">
          <FormError message={validationError || error} />
        </div>
      )}
      <FormActions>
        <Button
          variant="secondary"
          size="lg"
          disabled={isSaving}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="lg"
          isLoading={isSaving}
          loadingText="Saving..."
        >
          Save Work
        </Button>
      </FormActions>
    </form>
  );
}
