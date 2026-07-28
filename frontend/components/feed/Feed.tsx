"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import PostCard from "@/components/feed/PostCard";
import PostPagination from "@/components/feed/PostPagination";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import FormError from "@/components/ui/FormError";
import Skeleton from "@/components/ui/Skeleton";
import TextArea from "@/components/ui/TextArea";
import { getPostErrorMessage } from "@/services/api/postErrorMessage";
import { useAuthStore } from "@/store/auth.store";
import { usePostsStore } from "@/store/posts.store";

export default function Feed() {
  const user = useAuthStore((state) => state.user);
  const posts = usePostsStore((state) => state.globalPosts);
  const pageMetadata = usePostsStore((state) => state.globalPageMetadata);
  const status = usePostsStore((state) => state.globalStatus);
  const error = usePostsStore((state) => state.globalError);
  const createStatus = usePostsStore((state) => state.createStatus);
  const createError = usePostsStore((state) => state.createError);
  const loadPosts = usePostsStore((state) => state.loadGlobalPosts);
  const createPost = usePostsStore((state) => state.createPost);
  const [newPost, setNewPost] = useState("");

  useEffect(() => {
    if (status === "idle") {
      void loadPosts().catch(() => undefined);
    }
  }, [loadPosts, status]);

  async function handlePost() {
    const content = newPost.trim();
    if (!content || createStatus === "loading") return;
    try {
      await createPost(content);
      setNewPost("");
    } catch {
      // The store retains the typed error and the composer retains the draft.
    }
  }

  return (
    <section className="space-y-4">
      {user ? (
        <Card padding="sm">
          <TextArea
            value={newPost}
            onChange={(event) => setNewPost(event.target.value)}
            placeholder="Post something..."
            variant="composer"
            maxLength={3000}
            disabled={createStatus === "loading"}
            aria-label="Post content"
          />
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-gray-500">
              {newPost.length}/3000
            </span>
            <Button
              onClick={() => void handlePost()}
              disabled={!newPost.trim()}
              isLoading={createStatus === "loading"}
              loadingText="Posting..."
            >
              Share Post
            </Button>
          </div>
          {createError && (
            <div className="mt-3">
              <FormError message={getPostErrorMessage(createError)} />
            </div>
          )}
        </Card>
      ) : (
        <Card padding="sm" className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-600">Sign in to share a post.</p>
          <Link
            href="/login"
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        </Card>
      )}

      {status === "loading" && posts.length === 0 && (
        <div aria-label="Loading posts" className="space-y-4">
          {[0, 1, 2].map((item) => (
            <Card key={item}>
              <Skeleton shape="text" className="mb-2 w-40" />
              <Skeleton shape="text" className="mb-5 w-28" />
              <Skeleton shape="text" className="mb-2 w-full" />
              <Skeleton shape="text" className="w-3/4" />
            </Card>
          ))}
        </div>
      )}

      {status === "error" && (
        <EmptyState
          title="The feed could not be loaded"
          description={getPostErrorMessage(error)}
          action={
            <Button onClick={() => void loadPosts().catch(() => undefined)}>
              Try again
            </Button>
          }
        />
      )}

      {status === "loaded" && posts.length === 0 && (
        <EmptyState
          title="No posts yet"
          description="Be the first person to share something."
        />
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      <PostPagination
        metadata={pageMetadata}
        isLoading={status === "loading"}
        onPageChange={(page) =>
          void loadPosts({ page, size: pageMetadata?.size }).catch(
            () => undefined,
          )
        }
      />
    </section>
  );
}
