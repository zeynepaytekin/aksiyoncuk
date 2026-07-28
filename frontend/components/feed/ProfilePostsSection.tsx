"use client";

import { useEffect } from "react";

import PostCard from "@/components/feed/PostCard";
import PostPagination from "@/components/feed/PostPagination";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { getPostErrorMessage } from "@/services/api/postErrorMessage";
import { usePostsStore } from "@/store/posts.store";

export default function ProfilePostsSection() {
  const posts = usePostsStore((state) => state.myPosts);
  const metadata = usePostsStore((state) => state.myPageMetadata);
  const status = usePostsStore((state) => state.myStatus);
  const error = usePostsStore((state) => state.myError);
  const loadPosts = usePostsStore((state) => state.loadMyPosts);

  useEffect(() => {
    if (status === "idle") {
      void loadPosts().catch(() => undefined);
    }
  }, [loadPosts, status]);

  return (
    <Card as="section">
      <h2 className="mb-4 text-lg font-bold">My Posts</h2>

      {status === "loading" && posts.length === 0 && (
        <div aria-label="Loading your posts" className="space-y-3">
          <Skeleton shape="text" className="w-40" />
          <Skeleton shape="text" className="w-full" />
          <Skeleton shape="text" className="w-3/4" />
        </div>
      )}

      {status === "error" && (
        <EmptyState
          title={getPostErrorMessage(error)}
          action={
            <Button
              size="sm"
              onClick={() => void loadPosts().catch(() => undefined)}
            >
              Try again
            </Button>
          }
        />
      )}

      {status === "loaded" && posts.length === 0 && (
        <EmptyState compact title="You have not shared a post yet." />
      )}

      {posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} compact />
          ))}
        </div>
      )}

      <div className="mt-4">
        <PostPagination
          metadata={metadata}
          isLoading={status === "loading"}
          onPageChange={(page) =>
            void loadPosts({ page, size: metadata?.size }).catch(
              () => undefined,
            )
          }
        />
      </div>
    </Card>
  );
}
