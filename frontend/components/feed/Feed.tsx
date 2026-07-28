"use client";

import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import TextArea from "@/components/ui/TextArea";
import { useAuthStore } from "@/store/auth.store";
import { useContentStore } from "@/store/content.store";
import type { Comment, Post } from "@/types/feed";

export default function Feed() {
  const user = useAuthStore((state) => state.user);
  const posts = useContentStore((state) => state.posts);
  const loadPosts = useContentStore((state) => state.loadPosts);
  const addPost = useContentStore((state) => state.addPost);
  const togglePostLike = useContentStore((state) => state.togglePostLike);
  const addComment = useContentStore((state) => state.addComment);

  const [newPost, setNewPost] = useState("");
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>(
    {}
  );

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  function getAuthorName(): string {
    return user?.fullName || user?.email || "User";
  }

  function handlePost() {
    if (!newPost.trim()) return;

    const newItem: Post = {
      id: Date.now(),
      author: getAuthorName(),
      content: newPost,
      createdAt: new Date().toLocaleString(),
      likes: 0,
      isLiked: false,
      comments: [],
      userEmail: user?.email || "",
    };

    void addPost(newItem);
    setNewPost("");
  }

  function handleLike(postId: number) {
    void togglePostLike(postId);
  }

  function handleCommentChange(postId: number, value: string) {
    setCommentInputs((currentInputs) => ({
      ...currentInputs,
      [postId]: value,
    }));
  }

  function handleCommentSubmit(postId: number) {
    const value = commentInputs[postId];

    if (!value || !value.trim()) return;

    const newComment: Comment = {
      id: Date.now(),
      author: getAuthorName(),
      content: value,
      createdAt: new Date().toLocaleString(),
    };

    void addComment(postId, newComment);

    setCommentInputs((currentInputs) => ({
      ...currentInputs,
      [postId]: "",
    }));
  }

  return (
    <section className="space-y-4">
      <Card padding="sm">
        <TextArea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Post something..."
          variant="composer"
        />

        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <Button variant="soft" size="none" className="px-4 py-2 text-sm font-medium">
              Video
            </Button>
            <Button variant="soft" size="none" className="px-4 py-2 text-sm font-medium">
              Photo
            </Button>
            <Button variant="soft" size="none" className="px-4 py-2 text-sm font-medium">
              Attach
            </Button>
          </div>

          <Button
            onClick={handlePost}
          >
            Share Post
          </Button>
        </div>
      </Card>

      {posts.map((post) => (
        <Card
          as="article"
          key={post.id}
        >
          <div className="mb-3">
            <h3 className="font-semibold text-gray-900">{post.author}</h3>
            <p className="text-xs text-gray-500">{post.createdAt}</p>
          </div>

          <p className="text-sm leading-6 text-gray-700">{post.content}</p>

          <div className="mt-4 flex gap-4 border-b border-gray-100 pb-4 text-sm text-gray-500">
            <Button
              variant="unstyled"
              size="none"
              shape="none"
              onClick={() => handleLike(post.id)}
              className={
                post.isLiked ? "font-semibold text-black" : "hover:text-black"
              }
            >
              {post.isLiked ? "Liked" : "Like"} ({post.likes})
            </Button>

            <span>Comments ({post.comments.length})</span>

            <Button variant="unstyled" size="none" shape="none" className="hover:text-black">
              Share
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {post.comments.map((comment) => (
              <div key={comment.id} className="rounded-xl bg-gray-50 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">
                    {comment.author}
                  </p>
                  <p className="text-xs text-gray-400">{comment.createdAt}</p>
                </div>

                <p className="text-sm text-gray-700">{comment.content}</p>
              </div>
            ))}

            <div className="flex gap-2">
              <Input
                value={commentInputs[post.id] || ""}
                onChange={(e) =>
                  handleCommentChange(post.id, e.target.value)
                }
                placeholder="Write a comment..."
                variant="subtle"
              />

              <Button
                onClick={() => handleCommentSubmit(post.id)}
              >
                Send
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </section>
  );
}
