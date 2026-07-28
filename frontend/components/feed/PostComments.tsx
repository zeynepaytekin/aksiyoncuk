"use client";

import Link from "next/link";
import { useState } from "react";

import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import FormError from "@/components/ui/FormError";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import TextArea from "@/components/ui/TextArea";
import { getCommentErrorMessage } from "@/services/api/commentErrorMessage";
import { useAuthStore } from "@/store/auth.store";
import { useCommentsStore } from "@/store/comments.store";
import type { PostComment } from "@/types/comments";
import { formatUtcDate } from "@/utils/formatDate";

type PostCommentsProps = {
  postId: string;
  regionId: string;
};

function CommentItem({
  comment,
  postId,
}: {
  comment: PostComment;
  postId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const deleteComment = useCommentsStore((state) => state.deleteComment);
  const deleteStatus = useCommentsStore(
    (state) => state.deleteStatusByCommentId[comment.id] ?? "idle",
  );

  async function handleDelete() {
    setMessage("");
    try {
      await deleteComment(postId, comment.id);
      setConfirming(false);
    } catch (error) {
      setMessage(getCommentErrorMessage(error));
    }
  }

  return (
    <article className="rounded-xl bg-gray-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {comment.author.fullName}
          </p>
          <p className="text-xs text-gray-500">
            @{comment.author.username}
            {comment.author.professionalTitle
              ? ` · ${comment.author.professionalTitle}`
              : ""}
          </p>
          <time className="text-xs text-gray-400" dateTime={comment.createdAt}>
            {formatUtcDate(comment.createdAt)}
          </time>
        </div>
        {comment.ownedByCurrentUser && (
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            Delete comment
          </Button>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
        {comment.content}
      </p>

      <Modal
        isOpen={confirming}
        onClose={() => {
          if (deleteStatus !== "loading") setConfirming(false);
        }}
        title="Delete comment?"
        description="This action cannot be undone."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={deleteStatus === "loading"}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
            <Button
              isLoading={deleteStatus === "loading"}
              loadingText="Deleting..."
              onClick={() => void handleDelete()}
            >
              Delete comment
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Your comment will be permanently removed.
        </p>
        {message && (
          <div className="mt-3">
            <FormError message={message} />
          </div>
        )}
      </Modal>
    </article>
  );
}

export default function PostComments({ postId, regionId }: PostCommentsProps) {
  const user = useAuthStore((state) => state.user);
  const comments = useCommentsStore(
    (state) => state.commentsByPostId[postId] ?? [],
  );
  const metadata = useCommentsStore(
    (state) => state.pageMetadataByPostId[postId],
  );
  const status = useCommentsStore(
    (state) => state.statusByPostId[postId] ?? "idle",
  );
  const error = useCommentsStore((state) => state.errorByPostId[postId]);
  const createStatus = useCommentsStore(
    (state) => state.createStatusByPostId[postId] ?? "idle",
  );
  const createError = useCommentsStore(
    (state) => state.createErrorByPostId[postId],
  );
  const loadComments = useCommentsStore((state) => state.loadComments);
  const createComment = useCommentsStore((state) => state.createComment);
  const [draft, setDraft] = useState("");

  async function submitComment() {
    const content = draft.trim();
    if (!content || createStatus === "loading") return;
    try {
      await createComment(postId, content);
      setDraft("");
    } catch {
      // The store owns the typed error; a failed draft remains editable.
    }
  }

  return (
    <section
      id={regionId}
      aria-label="Comments"
      className="mt-4 space-y-3 border-t border-gray-100 pt-4"
    >
      {status === "loading" && comments.length === 0 && (
        <div role="status" aria-label="Loading comments" className="space-y-2">
          <Skeleton shape="text" className="w-36" />
          <Skeleton shape="text" className="w-full" />
        </div>
      )}

      {status === "error" && (
        <EmptyState
          title="Comments could not be loaded"
          description={getCommentErrorMessage(error)}
          action={
            <Button
              size="sm"
              onClick={() =>
                void loadComments(postId).catch(() => undefined)
              }
            >
              Try again
            </Button>
          }
        />
      )}

      {status === "loaded" && comments.length === 0 && (
        <EmptyState compact title="No comments yet." />
      )}

      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} postId={postId} />
      ))}

      {metadata && metadata.totalPages > 1 && (
        <nav aria-label="Comment pages" className="flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            disabled={metadata.first || status === "loading"}
            onClick={() =>
              void loadComments(postId, {
                page: metadata.page - 1,
                size: metadata.size,
              }).catch(() => undefined)
            }
          >
            Previous comments
          </Button>
          <span className="text-xs text-gray-500">
            Page {metadata.page + 1} of {metadata.totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={metadata.last || status === "loading"}
            onClick={() =>
              void loadComments(postId, {
                page: metadata.page + 1,
                size: metadata.size,
              }).catch(() => undefined)
            }
          >
            Next comments
          </Button>
        </nav>
      )}

      {user ? (
        <div className="rounded-xl border border-gray-200 p-3">
          <label
            htmlFor={`${regionId}-composer`}
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Add a comment
          </label>
          <TextArea
            id={`${regionId}-composer`}
            value={draft}
            maxLength={2000}
            disabled={createStatus === "loading"}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a comment..."
            className="min-h-20"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-500">{draft.length}/2000</span>
            <Button
              size="sm"
              disabled={!draft.trim()}
              isLoading={createStatus === "loading"}
              loadingText="Commenting..."
              onClick={() => void submitComment()}
            >
              Comment
            </Button>
          </div>
          {createError && (
            <div className="mt-2">
              <FormError message={getCommentErrorMessage(createError)} />
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          <Link href="/login" className="font-semibold text-black underline">
            Sign in
          </Link>{" "}
          to add a comment.
        </p>
      )}
    </section>
  );
}
