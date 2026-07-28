import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import type { Post } from "@/types/feed";

type ProfilePostsSectionProps = {
  posts: Post[];
};

export default function ProfilePostsSection({
  posts,
}: ProfilePostsSectionProps) {
  return (
    <Card as="section">
      <h2 className="mb-4 text-lg font-bold">My Posts</h2>

      {posts.length === 0 ? (
        <EmptyState compact title="Henüz post paylaşmadın." />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-xl border border-gray-200 p-4"
            >
              <div className="mb-2">
                <p className="text-sm font-semibold text-gray-900">
                  {post.author}
                </p>
                <p className="text-xs text-gray-400">{post.createdAt}</p>
              </div>

              <p className="text-sm leading-6 text-gray-700">{post.content}</p>

              <div className="mt-3 flex gap-4 text-xs text-gray-500">
                <span>Likes: {post.likes}</span>
                <span>Comments: {post.comments?.length || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
