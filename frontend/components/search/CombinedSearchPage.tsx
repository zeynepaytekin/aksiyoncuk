"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import JobCard from "@/components/jobs/JobCard";
import AppShell from "@/components/layout/AppShell";
import { SearchPostCard, SearchUserCard } from "@/components/search/SearchUi";
import EmptyState from "@/components/ui/EmptyState";
import FormError from "@/components/ui/FormError";
import Skeleton from "@/components/ui/Skeleton";
import WorkCard from "@/components/works/WorkCard";
import { getSearchErrorMessage } from "@/services/api/searchErrorMessage";
import { useAuthStore } from "@/store/auth.store";
import { useSearchStore } from "@/store/search.store";

export default function CombinedSearchPage() {
  const params = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const results = useSearchStore((state) => state.combinedResults);
  const status = useSearchStore((state) => state.combinedStatus);
  const error = useSearchStore((state) => state.combinedError);
  const search = useSearchStore((state) => state.searchCombined);
  const toggleFollow = useSearchStore((state) => state.toggleFollow);
  const togglePostLike = useSearchStore((state) => state.togglePostLike);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (query.length >= 2 && query.length <= 100) {
      void search(query).catch(() => undefined);
    }
  }, [query, search, user?.id]);

  const invalid = query.length < 2 || query.length > 100;
  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="mt-1 text-sm text-gray-500">
          {invalid ? "Enter a query between 2 and 100 characters." : `Results for “${query}”`}
        </p>
        {invalid && (
          <EmptyState
            className="mt-6"
            title="Search Aksiyoncuk"
            description="Use the navigation search field to find people, posts, works, and jobs."
          />
        )}
        {status === "loading" && !invalid && (
          <div className="mt-6 space-y-4" aria-live="polite">
            <span className="sr-only">Loading search results</span>
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        )}
        {status === "error" && error && (
          <div className="mt-6" role="alert">
            <FormError message={getSearchErrorMessage(error)} />
          </div>
        )}
        {status === "loaded" && results && (
          <div className="mt-8 space-y-10">
            <Group
              title="People"
              total={results.users.totalElements}
              href={`/search/users?q=${encodeURIComponent(query)}`}
            >
              {results.users.content.map((person) => (
                <SearchUserCard
                  key={person.id}
                  user={person}
                  currentUserId={user?.id}
                  onToggle={
                    user ? () => void toggleFollow(person.username) : undefined
                  }
                />
              ))}
            </Group>
            <Group
              title="Posts"
              total={results.posts.totalElements}
              href={`/search/posts?q=${encodeURIComponent(query)}`}
            >
              {results.posts.content.map((post) => (
                <SearchPostCard
                  key={post.id}
                  post={post}
                  authenticated={!!user}
                  onToggleLike={() => void togglePostLike(post.id)}
                />
              ))}
            </Group>
            <Group
              title="Works"
              total={results.works.totalElements}
              href={`/search/works?q=${encodeURIComponent(query)}`}
            >
              {results.works.content.map((work) => (
                <WorkCard key={work.id} work={work} />
              ))}
            </Group>
            <Group
              title="Jobs"
              total={results.jobs.totalElements}
              href={`/search/jobs?q=${encodeURIComponent(query)}`}
            >
              {results.jobs.content.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </Group>
          </div>
        )}
      </main>
    </AppShell>
  );
}

function Group({
  children,
  href,
  title,
  total,
}: {
  children: React.ReactNode;
  href: string;
  title: string;
  total: number;
}) {
  return (
    <section aria-labelledby={`search-${title.toLowerCase()}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 id={`search-${title.toLowerCase()}`} className="text-xl font-semibold">
          {title} ({total})
        </h2>
        <Link href={href} className="text-sm font-medium underline">
          View all {title.toLowerCase()}
        </Link>
      </div>
      {total === 0 ? (
        <EmptyState compact title={`No matching ${title.toLowerCase()}`} />
      ) : (
        <div className="space-y-4">{children}</div>
      )}
    </section>
  );
}
