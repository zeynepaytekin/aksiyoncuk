"use client";

import Link from "next/link";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { Post } from "@/types/feed";
import type { SearchUser } from "@/types/search";
import { formatUtcDate } from "@/utils/formatDate";

export function SearchUserCard({
  currentUserId,
  onToggle,
  pending,
  user,
}: {
  currentUserId?: string;
  onToggle?: () => void;
  pending?: boolean;
  user: SearchUser;
}) {
  const own = currentUserId === user.id;
  return (
    <Card as="article">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/users?username=${encodeURIComponent(user.username)}`}
            className="font-semibold hover:underline"
          >
            {user.fullName}
          </Link>
          <p className="text-sm text-gray-500">@{user.username}</p>
          <p className="mt-1 text-sm text-gray-600">
            {user.professionalTitle ?? "Creative professional"}
            {user.location ? ` · ${user.location}` : ""}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {user.followerCount} followers · {user.followingCount} following
          </p>
        </div>
        {!own &&
          (onToggle ? (
            <Button
              size="sm"
              variant={user.followedByCurrentUser ? "secondary" : "primary"}
              aria-pressed={user.followedByCurrentUser}
              disabled={pending}
              onClick={onToggle}
            >
              {user.followedByCurrentUser ? "Following" : "Follow"}
            </Button>
          ) : (
            <Link className="text-sm underline" href="/login">
              Sign in to follow
            </Link>
          ))}
      </div>
    </Card>
  );
}

export function SearchPostCard({
  authenticated,
  onToggleLike,
  post,
}: {
  authenticated: boolean;
  onToggleLike?: () => void;
  post: Post;
}) {
  return (
    <Card as="article">
      <div className="flex justify-between gap-3">
        <div>
          <Link
            href={`/users?username=${encodeURIComponent(post.author.username)}`}
            className="font-semibold hover:underline"
          >
            {post.author.fullName}
          </Link>
          <p className="text-xs text-gray-500">
            @{post.author.username}
            {post.author.professionalTitle
              ? ` · ${post.author.professionalTitle}`
              : ""}
          </p>
        </div>
        <time dateTime={post.createdAt} className="text-xs text-gray-400">
          {formatUtcDate(post.createdAt)}
        </time>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
        {post.content}
      </p>
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <button
          type="button"
          disabled={!authenticated}
          aria-pressed={post.likedByCurrentUser}
          aria-label={`${post.likedByCurrentUser ? "Unlike" : "Like"} post, ${post.likeCount} likes`}
          title={authenticated ? undefined : "Sign in to like posts"}
          onClick={onToggleLike}
          className="disabled:cursor-not-allowed disabled:opacity-60"
        >
          {post.likedByCurrentUser ? "Liked" : "Like"} ({post.likeCount})
        </button>
        <span>Comments ({post.commentCount})</span>
        <Link href={`/posts/view?id=${encodeURIComponent(post.id)}`}>
          View post
        </Link>
      </div>
    </Card>
  );
}
