export default function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span aria-label={`${count} unread messages`} className="min-w-6 rounded-full bg-black px-2 py-0.5 text-center text-xs font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
