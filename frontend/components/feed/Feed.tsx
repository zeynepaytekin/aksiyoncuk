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
import ImageFilePicker from "@/components/media/ImageFilePicker";
import { getPostErrorMessage } from "@/services/api/postErrorMessage";
import { mediaService } from "@/services/api/media.service";
import { postsService } from "@/services/api/posts.service";
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
  const syncPost = usePostsStore((state) => state.syncPost);
  const [newPost, setNewPost] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [mediaMessage, setMediaMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [failedPostId, setFailedPostId] = useState("");

  useEffect(() => {
    if (status === "idle") {
      void loadPosts().catch(() => undefined);
    }
  }, [loadPosts, status]);

  async function handlePost() {
    const content = newPost.trim();
    if (!content || createStatus === "loading" || uploading) return;
    try {
      const post = await createPost(content);
      setNewPost("");
      if (images.length) {
        setUploading(true);
        const failed: File[] = [];
        for (const image of images) {
          try { await mediaService.uploadPostImage(post.id, image); }
          catch { failed.push(image); }
        }
        const authoritative = await postsService.getById(post.id);
        syncPost(authoritative);
        setImages(failed);
        setFailedPostId(failed.length ? post.id : "");
        setMediaMessage(failed.length
          ? `Post created. ${images.length - failed.length} image(s) uploaded; ${failed.length} failed and can be retried.`
          : "Post and images shared.");
      } else {
        setImages([]);
      }
    } catch {
      // The store retains the typed error and the composer retains the draft.
    } finally {
      setUploading(false);
    }
  }

  async function retryImages() {
    if (!failedPostId || !images.length || uploading) return;
    setUploading(true);
    const failed: File[] = [];
    for (const image of images) {
      try { await mediaService.uploadPostImage(failedPostId, image); }
      catch { failed.push(image); }
    }
    syncPost(await postsService.getById(failedPostId));
    setImages(failed);
    setMediaMessage(failed.length ? `${failed.length} image(s) still failed.` : "All images uploaded.");
    if (!failed.length) setFailedPostId("");
    setUploading(false);
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
            disabled={createStatus === "loading" || uploading}
            aria-label="Post content"
          />
          <div className="my-3">
            <ImageFilePicker purpose="post" maximum={4} files={images}
              onChange={setImages} disabled={createStatus === "loading" || uploading} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-gray-500">
              {newPost.length}/3000
            </span>
            <Button
              onClick={() => void handlePost()}
              disabled={!newPost.trim() || uploading}
              isLoading={createStatus === "loading" || uploading}
              loadingText={uploading ? "Uploading images..." : "Posting..."}
            >
              Share Post
            </Button>
          </div>
          {createError && (
            <div className="mt-3">
              <FormError message={getPostErrorMessage(createError)} />
            </div>
          )}
          {mediaMessage && <p role="status" aria-live="polite" className="mt-3 text-sm text-gray-600">{mediaMessage}</p>}
          {failedPostId && images.length > 0 && (
            <Button type="button" variant="secondary" size="sm" className="mt-2"
              isLoading={uploading} onClick={() => void retryImages()}>
              Retry failed images
            </Button>
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
