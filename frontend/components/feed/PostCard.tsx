"use client";

import { useId, useState } from "react";
import Link from "next/link";

import PostComments from "@/components/feed/PostComments";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Dropdown from "@/components/ui/Dropdown";
import FormError from "@/components/ui/FormError";
import Modal from "@/components/ui/Modal";
import { getPostErrorMessage } from "@/services/api/postErrorMessage";
import { useCommentsStore } from "@/store/comments.store";
import { useAuthStore } from "@/store/auth.store";
import { usePostsStore } from "@/store/posts.store";
import type { Post } from "@/types/feed";
import { formatUtcDate } from "@/utils/formatDate";
import MediaGallery from "@/components/media/MediaGallery";
import { mediaService } from "@/services/api/media.service";
import { postsService } from "@/services/api/posts.service";
import { getMediaErrorMessage } from "@/services/api/mediaErrorMessage";
import ExistingMediaUpload from "@/components/media/ExistingMediaUpload";

type PostCardProps = {
  post: Post;
  compact?: boolean;
};

export default function PostCard({ compact = false, post }: PostCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isManagingMedia, setIsManagingMedia] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const commentsRegionId = useId();
  const deletePost = usePostsStore((state) => state.deletePost);
  const syncPost = usePostsStore((state) => state.syncPost);
  const user = useAuthStore((state) => state.user);
  const toggleLike = usePostsStore((state) => state.toggleLike);
  const clearLikeError = usePostsStore((state) => state.clearLikeError);
  const likeStatus = usePostsStore(
    (state) => state.likeStatusByPostId[post.id] ?? "idle",
  );
  const likeError = usePostsStore(
    (state) => state.likeErrorByPostId[post.id] ?? null,
  );
  const loadComments = useCommentsStore((state) => state.loadComments);
  const commentStatus = useCommentsStore(
    (state) => state.statusByPostId[post.id] ?? "idle",
  );
  const deleteStatus = usePostsStore(
    (state) => state.deleteStatusById[post.id] ?? "idle",
  );
  const media = post.media ?? [];

  async function handleDelete() {
    setDeleteMessage("");
    try {
      await deletePost(post.id);
      setIsConfirmingDelete(false);
    } catch (error) {
      setDeleteMessage(getPostErrorMessage(error));
    }
  }

  function toggleComments() {
    const opening = !commentsExpanded;
    setCommentsExpanded(opening);
    if (opening && commentStatus === "idle") {
      void loadComments(post.id, { page: 0, size: 20 }).catch(() => undefined);
    }
  }

  function handleLike() {
    clearLikeError(post.id);
    void toggleLike(post.id).catch(() => undefined);
  }

  async function reorderMedia(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (
      mediaBusy ||
      destination < 0 ||
      destination >= media.length
    ) {
      return;
    }
    const ids = media.map(({ id }) => id);
    [ids[index], ids[destination]] = [ids[destination], ids[index]];
    setMediaBusy(true);
    setMediaError("");
    try {
      await mediaService.reorderPostImages(post.id, ids);
      syncPost(await postsService.getById(post.id));
    } catch (error) {
      setMediaError(getMediaErrorMessage(error));
    } finally {
      setMediaBusy(false);
    }
  }

  async function deleteMedia(mediaId: string) {
    setMediaBusy(true);
    setMediaError("");
    try {
      await mediaService.deletePostImage(post.id, mediaId);
      syncPost(await postsService.getById(post.id));
    } catch (error) {
      setMediaError(getMediaErrorMessage(error));
    } finally {
      setMediaBusy(false);
    }
  }

  const body = (
    <>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">
            {post.author.fullName}
          </h3>
          <p className="text-xs text-gray-500">
            @{post.author.username}
            {post.author.professionalTitle
              ? ` · ${post.author.professionalTitle}`
              : ""}
          </p>
          <time className="text-xs text-gray-400" dateTime={post.createdAt}>
            {formatUtcDate(post.createdAt)}
          </time>
        </div>
        {post.ownedByCurrentUser && (
          <Dropdown
            align="right"
            label="Post actions"
            trigger={
              <span
                aria-hidden="true"
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-xl text-gray-600 hover:bg-gray-100"
              >
                ⋯
              </span>
            }
            items={[
              {
                id: "manage-images",
                label: "Manage images",
                onSelect: () => setIsManagingMedia(true),
              },
              {
                id: "delete",
                label: "Delete post",
                onSelect: () => setIsConfirmingDelete(true),
              },
            ]}
          />
        )}
      </div>

      <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
        {post.content}
      </p>
      <MediaGallery
        media={media}
        alt={`Post by ${post.author.fullName}`}
        compact={compact}
      />

      <div className="mt-4 flex gap-3 border-t border-gray-100 pt-4">
        {user ? (
          <Button
            variant={post.likedByCurrentUser ? "soft" : "ghost"}
            size="sm"
            aria-pressed={post.likedByCurrentUser}
            aria-label={`${post.likedByCurrentUser ? "Unlike" : "Like"} post, ${post.likeCount} likes`}
            disabled={likeStatus === "loading"}
            onClick={handleLike}
          >
            {post.likedByCurrentUser ? "Liked" : "Like"} ({post.likeCount})
          </Button>
        ) : (
          <Link
            href="/login"
            title="Sign in to like this post"
            aria-label={`Sign in to like post, ${post.likeCount} likes`}
            className="rounded-xl px-3 py-1 text-xs font-medium text-gray-500 hover:text-black"
          >
            Like ({post.likeCount})
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={commentsExpanded}
          aria-controls={commentsRegionId}
          onClick={toggleComments}
        >
          Comments ({post.commentCount})
        </Button>
        <Button variant="ghost" size="sm" disabled>
          Share · Coming soon
        </Button>
      </div>

      {likeError && (
        <div className="mt-2" role="status" aria-live="polite">
          <FormError message={getPostErrorMessage(likeError)} />
          {user && (
            <Button variant="ghost" size="sm" onClick={handleLike}>
              Try again
            </Button>
          )}
        </div>
      )}

      {commentsExpanded && (
        <PostComments postId={post.id} regionId={commentsRegionId} />
      )}

      {post.ownedByCurrentUser && (
        <Modal
          isOpen={isManagingMedia}
          onClose={() => {
            if (!mediaBusy) {
              setIsManagingMedia(false);
              setMediaError("");
            }
          }}
          title="Manage post images"
          description="Changes are applied immediately. Posts can contain up to four images."
          size="lg"
          footer={
            <Button
              type="button"
              variant="secondary"
              disabled={mediaBusy}
              onClick={() => {
                setIsManagingMedia(false);
                setMediaError("");
              }}
            >
              Done
            </Button>
          }
        >
          <p className="mb-4 text-sm font-medium text-gray-700">
            {media.length} / 4 images
          </p>

          {media.length > 0 ? (
            <div
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              aria-label="Current post images"
            >
              {media.map((item, index) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-gray-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={`Post image ${index + 1}`}
                    className="h-40 w-full bg-gray-100 object-cover"
                  />
                  <div className="flex flex-wrap gap-2 p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={mediaBusy || index === 0}
                      aria-label={`Move image ${index + 1} left`}
                      onClick={() => void reorderMedia(index, -1)}
                    >
                      ←
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={mediaBusy || index === media.length - 1}
                      aria-label={`Move image ${index + 1} right`}
                      onClick={() => void reorderMedia(index, 1)}
                    >
                      →
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={mediaBusy}
                      aria-label={`Delete image ${index + 1}`}
                      onClick={() => {
                        if (window.confirm(`Delete image ${index + 1}?`)) {
                          void deleteMedia(item.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              This post does not have any images yet.
            </p>
          )}

          {media.length < 4 && (
            <ExistingMediaUpload
              purpose="post"
              remaining={4 - media.length}
              upload={async (file) => {
                await mediaService.uploadPostImage(post.id, file);
                syncPost(await postsService.getById(post.id));
              }}
            />
          )}

          <div className="mt-3 min-h-5" aria-live="polite">
            {mediaBusy && (
              <p className="text-sm text-gray-500">Updating images…</p>
            )}
            {mediaError && (
              <div role="alert">
                <FormError message={mediaError} />
              </div>
            )}
          </div>
        </Modal>
      )}

      <Modal
        isOpen={isConfirmingDelete}
        onClose={() => {
          if (deleteStatus !== "loading") setIsConfirmingDelete(false);
        }}
        title="Delete post?"
        description="This action cannot be undone."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={deleteStatus === "loading"}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleDelete()}
              isLoading={deleteStatus === "loading"}
              loadingText="Deleting..."
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Your post will be permanently removed.
        </p>
        {deleteMessage && (
          <div className="mt-3">
            <FormError message={deleteMessage} />
          </div>
        )}
      </Modal>
    </>
  );

  return compact ? (
    <article className="rounded-xl border border-gray-200 p-4">{body}</article>
  ) : (
    <Card as="article">{body}</Card>
  );
}
