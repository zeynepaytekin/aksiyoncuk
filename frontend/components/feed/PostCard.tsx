"use client";

import { useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormError from "@/components/ui/FormError";
import Modal from "@/components/ui/Modal";
import { getPostErrorMessage } from "@/services/api/postErrorMessage";
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
  const deletePost = usePostsStore((state) => state.deletePost);
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
        {["Like · Coming soon", "Comment · Coming soon", "Share · Coming soon"].map(
          (label) => (
            <Button key={label} variant="ghost" size="sm" disabled>
              {label}
            </Button>
          ),
        )}
      </div>

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
