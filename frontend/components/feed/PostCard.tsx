"use client";

import { useId, useState } from "react";

import PostComments from "@/components/feed/PostComments";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormError from "@/components/ui/FormError";
import Modal from "@/components/ui/Modal";
import { getPostErrorMessage } from "@/services/api/postErrorMessage";
import { useCommentsStore } from "@/store/comments.store";
import { usePostsStore } from "@/store/posts.store";
import type { Post } from "@/types/feed";
import { formatUtcDate } from "@/utils/formatDate";

type PostCardProps = {
  post: Post;
  compact?: boolean;
};

export default function PostCard({ compact = false, post }: PostCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const commentsRegionId = useId();
  const deletePost = usePostsStore((state) => state.deletePost);
  const loadComments = useCommentsStore((state) => state.loadComments);
  const commentStatus = useCommentsStore(
    (state) => state.statusByPostId[post.id] ?? "idle",
  );
  const deleteStatus = usePostsStore(
    (state) => state.deleteStatusById[post.id] ?? "idle",
  );

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsConfirmingDelete(true)}
          >
            Delete
          </Button>
        )}
      </div>

      <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
        {post.content}
      </p>

      <div className="mt-4 flex gap-3 border-t border-gray-100 pt-4">
        <Button variant="ghost" size="sm" disabled>
          Like · Coming soon
        </Button>
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

      {commentsExpanded && (
        <PostComments postId={post.id} regionId={commentsRegionId} />
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
