"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import JobCard from "@/components/jobs/JobCard";
import AppShell from "@/components/layout/AppShell";
import SearchPagination from "@/components/search/SearchPagination";
import { SearchPostCard, SearchUserCard } from "@/components/search/SearchUi";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormError from "@/components/ui/FormError";
import Skeleton from "@/components/ui/Skeleton";
import WorkCard from "@/components/works/WorkCard";
import {
  COMPENSATION_TYPE_VALUES,
  JOB_CATEGORY_VALUES,
  JOB_STATUS_VALUES,
  WORK_MODE_VALUES,
} from "@/types/jobs";
import { WORK_TYPE_VALUES } from "@/types/works";
import { getSearchErrorMessage } from "@/services/api/searchErrorMessage";
import { useAuthStore } from "@/store/auth.store";
import { useSearchStore } from "@/store/search.store";
import type {
  JobSearchParams,
  PostSearchParams,
  SearchResourceType,
  UserSearchParams,
  WorkSearchParams,
} from "@/types/search";

type Kind = Exclude<SearchResourceType, "all">;

export default function ResourceSearchPage({ kind }: { kind: Kind }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q")?.trim() ?? "";
  const page = Number(searchParams.get("page") ?? "0");
  const size = Number(searchParams.get("size") ?? "20");
  const state = useSearchStore();
  const user = useAuthStore((auth) => auth.user);
  const invalid =
    query.length < 2 ||
    query.length > 100 ||
    !Number.isInteger(page) ||
    page < 0 ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 50;

  const params = resourceParams(kind, searchParams, query, page, size);
  const load = resourceLoader(kind, state);

  useEffect(() => {
    if (!invalid) void load(params).catch(() => undefined);
    // params is derived from the URL string and load actions are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalid, kind, searchParams.toString(), user?.id]);

  const results = state[`${kind}Results`];
  const metadata = state[`${kind}PageMetadata`];
  const status = state[`${kind}Status`];
  const error = state[`${kind}Error`];

  function navigate(next: Record<string, string | number | undefined>) {
    const values = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") values.delete(key);
      else values.set(key, String(value));
    });
    router.push(`/search/${kind}?${values.toString()}`);
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">{labels[kind]} search</h1>
        <p className="mt-1 text-sm text-gray-500">
          {invalid ? "Enter a valid query between 2 and 100 characters." : `Results for “${query}”`}
        </p>
        {!invalid && kind !== "users" && (
          <Filters kind={kind} values={searchParams} onChange={navigate} />
        )}
        {invalid && <EmptyState className="mt-6" title="Invalid search" description="Check the query and pagination values." />}
        {status === "loading" && !invalid && (
          <div className="mt-6 space-y-3" aria-live="polite">
            <span className="sr-only">Loading search results</span>
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        )}
        {status === "error" && error && (
          <div className="mt-6" role="alert">
            <FormError message={getSearchErrorMessage(error)} />
            <Button className="mt-3" onClick={() => void load(params)}>
              Try again
            </Button>
          </div>
        )}
        {status === "loaded" && results.length === 0 && (
          <EmptyState className="mt-6" title={`No matching ${labels[kind].toLowerCase()}`} description={`Nothing matched “${query}”.`} />
        )}
        {status === "loaded" && results.length > 0 && (
          <div className="mt-6 space-y-4">
            {kind === "users" &&
              state.usersResults.map((person) => (
                <SearchUserCard
                  key={person.id}
                  user={person}
                  currentUserId={user?.id}
                  onToggle={user ? () => void state.toggleFollow(person.username) : undefined}
                />
              ))}
            {kind === "posts" &&
              state.postsResults.map((post) => (
                <SearchPostCard
                  key={post.id}
                  post={post}
                  authenticated={!!user}
                  onToggleLike={() => void state.togglePostLike(post.id)}
                />
              ))}
            {kind === "works" &&
              state.worksResults.map((work) => <WorkCard key={work.id} work={work} />)}
            {kind === "jobs" &&
              state.jobsResults.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        )}
        {metadata && status === "loaded" && (
          <SearchPagination
            {...metadata}
            loading={false}
            onPage={(nextPage) => navigate({ page: nextPage })}
          />
        )}
      </main>
    </AppShell>
  );
}

const labels: Record<Kind, string> = {
  users: "People",
  posts: "Posts",
  works: "Works",
  jobs: "Jobs",
};

function resourceLoader(kind: Kind, state: ReturnType<typeof useSearchStore.getState>) {
  if (kind === "users") return (params: object) => state.searchUsers(params as UserSearchParams);
  if (kind === "posts") return (params: object) => state.searchPosts(params as PostSearchParams);
  if (kind === "works") return (params: object) => state.searchWorks(params as WorkSearchParams);
  return (params: object) => state.searchJobs(params as JobSearchParams);
}

function resourceParams(kind: Kind, values: URLSearchParams, q: string, page: number, size: number) {
  const base = { q, page, size };
  if (kind === "posts") return { ...base, authorUsername: values.get("authorUsername") || undefined };
  if (kind === "works")
    return {
      ...base,
      workType: values.get("workType") || undefined,
      ownerUsername: values.get("ownerUsername") || undefined,
      releaseYear: values.get("releaseYear") ? Number(values.get("releaseYear")) : undefined,
    } as WorkSearchParams;
  if (kind === "jobs")
    return {
      ...base,
      category: values.get("category") || undefined,
      workMode: values.get("workMode") || undefined,
      status: values.get("status") || undefined,
      compensationType: values.get("compensationType") || undefined,
      ownerUsername: values.get("ownerUsername") || undefined,
    } as JobSearchParams;
  return base;
}

function Filters({
  kind,
  onChange,
  values,
}: {
  kind: Exclude<Kind, "users">;
  onChange: (values: Record<string, string | number | undefined>) => void;
  values: URLSearchParams;
}) {
  const selectClass = "rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm";
  return (
    <Card className="mt-5">
      <div className="flex flex-wrap gap-3">
        {kind === "posts" && <FilterInput label="Author username" name="authorUsername" values={values} onChange={onChange} />}
        {kind === "works" && (
          <>
            <FilterSelect label="Work type" name="workType" options={WORK_TYPE_VALUES} values={values} onChange={onChange} className={selectClass} />
            <FilterInput label="Owner username" name="ownerUsername" values={values} onChange={onChange} />
            <FilterInput label="Release year" name="releaseYear" type="number" values={values} onChange={onChange} />
          </>
        )}
        {kind === "jobs" && (
          <>
            <FilterSelect label="Category" name="category" options={JOB_CATEGORY_VALUES} values={values} onChange={onChange} className={selectClass} />
            <FilterSelect label="Work mode" name="workMode" options={WORK_MODE_VALUES} values={values} onChange={onChange} className={selectClass} />
            <FilterSelect label="Status" name="status" options={JOB_STATUS_VALUES} values={values} onChange={onChange} className={selectClass} />
            <FilterSelect label="Compensation" name="compensationType" options={COMPENSATION_TYPE_VALUES} values={values} onChange={onChange} className={selectClass} />
            <FilterInput label="Owner username" name="ownerUsername" values={values} onChange={onChange} />
          </>
        )}
      </div>
    </Card>
  );
}

function FilterInput({ label, name, onChange, type = "text", values }: { label: string; name: string; onChange: (values: Record<string, string | undefined>) => void; type?: string; values: URLSearchParams }) {
  return <label className="text-xs font-medium">{label}<input type={type} defaultValue={values.get(name) ?? ""} onBlur={(event) => onChange({ [name]: event.target.value || undefined, page: "0" })} className="mt-1 block rounded-xl border border-gray-300 px-3 py-2 text-sm" /></label>;
}

function FilterSelect({ className, label, name, onChange, options, values }: { className: string; label: string; name: string; onChange: (values: Record<string, string | undefined>) => void; options: readonly string[]; values: URLSearchParams }) {
  return <label className="text-xs font-medium">{label}<select aria-label={label} value={values.get(name) ?? ""} onChange={(event) => onChange({ [name]: event.target.value || undefined, page: "0" })} className={`mt-1 block ${className}`}><option value="">Any</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
