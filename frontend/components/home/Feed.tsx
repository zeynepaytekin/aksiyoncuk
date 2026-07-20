"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

type Comment = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
};

type Post = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
  likes: number;
  isLiked: boolean;
  comments: Comment[];
  userEmail: string;
};

const POSTS_KEY = "aksiyoncuk_posts";

const defaultPosts: Post[] = [
  {
    id: 1,
    author: "Emma Wilson",
    content:
      "Looking for a color grading specialist for an upcoming short film project.",
    createdAt: "Today",
    likes: 3,
    isLiked: false,
    comments: [],
    userEmail: "",
  },
  {
    id: 2,
    author: "Luca Moretti",
    content:
      "Just published a new portfolio piece. Feedback from the community is welcome.",
    createdAt: "Today",
    likes: 7,
    isLiked: false,
    comments: [],
    userEmail: "",
  },
];

export default function Feed() {
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>(
    {}
  );

  useEffect(() => {
    const storedPosts = localStorage.getItem(POSTS_KEY);

    if (storedPosts) {
      const parsedPosts = JSON.parse(storedPosts) as Post[];

      const normalizedPosts = parsedPosts.map((post) => ({
        ...post,
        likes: post.likes ?? 0,
        isLiked: post.isLiked ?? false,
        comments: post.comments ?? [],
        userEmail: post.userEmail ?? "",
      }));

      setPosts(normalizedPosts);
    } else {
      setPosts(defaultPosts);
    }
  }, []);

  useEffect(() => {
    if (posts.length > 0) {
      localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    }
  }, [posts]);

  function getAuthorName() {
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

    setPosts([newItem, ...posts]);
    setNewPost("");
  }

  function handleLike(postId: number) {
    const updatedPosts = posts.map((post) => {
      if (post.id !== postId) return post;

      return {
        ...post,
        isLiked: !post.isLiked,
        likes: post.isLiked ? post.likes - 1 : post.likes + 1,
      };
    });

    setPosts(updatedPosts);
  }

  function handleCommentChange(postId: number, value: string) {
    setCommentInputs({
      ...commentInputs,
      [postId]: value,
    });
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

    const updatedPosts = posts.map((post) => {
      if (post.id !== postId) return post;

      return {
        ...post,
        comments: [...post.comments, newComment],
      };
    });

    setPosts(updatedPosts);

    setCommentInputs({
      ...commentInputs,
      [postId]: "",
    });
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Post something..."
          className="mb-3 min-h-24 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-black"
        />

        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              Video
            </button>
            <button className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              Photo
            </button>
            <button className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              Attach
            </button>
          </div>

          <button
            onClick={handlePost}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Share Post
          </button>
        </div>
      </div>

      {posts.map((post) => (
        <article
          key={post.id}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-3">
            <h3 className="font-semibold text-gray-900">{post.author}</h3>
            <p className="text-xs text-gray-500">{post.createdAt}</p>
          </div>

          <p className="text-sm leading-6 text-gray-700">{post.content}</p>

          <div className="mt-4 flex gap-4 border-b border-gray-100 pb-4 text-sm text-gray-500">
            <button
              onClick={() => handleLike(post.id)}
              className={
                post.isLiked ? "font-semibold text-black" : "hover:text-black"
              }
            >
              {post.isLiked ? "Liked" : "Like"} ({post.likes})
            </button>

            <span>Comments ({post.comments.length})</span>

            <button className="hover:text-black">Share</button>
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
              <input
                value={commentInputs[post.id] || ""}
                onChange={(e) =>
                  handleCommentChange(post.id, e.target.value)
                }
                placeholder="Write a comment..."
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              />

              <button
                onClick={() => handleCommentSubmit(post.id)}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Send
              </button>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}