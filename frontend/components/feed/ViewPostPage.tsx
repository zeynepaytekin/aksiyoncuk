"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import PostCard from "@/components/feed/PostCard";
import AppShell from "@/components/layout/AppShell";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { ApiError } from "@/services/api/apiClient";
import { getPostErrorMessage } from "@/services/api/postErrorMessage";
import { postsService } from "@/services/api/posts.service";
import type { Post } from "@/types/feed";

export default function ViewPostPage() {
  const postId = useSearchParams().get("id")?.trim() ?? "";
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!postId) return;
    let active = true;
    void postsService
      .getById(postId)
      .then((value) => {
        if (active) setPost(value);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof ApiError
              ? reason
              : new ApiError(0, "NETWORK_ERROR", "Unable to load post."),
          );
        }
      });
    return () => {
      active = false;
    };
  }, [postId]);

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-8">
        {!postId && <EmptyState title="Post ID required" />}
        {postId && !post && !error && (
          <Skeleton aria-label="Loading post" className="h-72" />
        )}
        {error && (
          <EmptyState
            title={error.code === "POST_NOT_FOUND" ? "Post not found" : "Unable to load post"}
            description={getPostErrorMessage(error)}
          />
        )}
        {post && <PostCard post={post} />}
      </section>
    </AppShell>
  );
}
