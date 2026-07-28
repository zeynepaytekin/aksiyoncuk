import Button from "@/components/ui/Button";
import type { PostPageMetadata } from "@/types/feed";

type PostPaginationProps = {
  metadata: PostPageMetadata | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
};

export default function PostPagination({
  isLoading,
  metadata,
  onPageChange,
}: PostPaginationProps) {
  if (!metadata || metadata.totalPages <= 1) return null;

  return (
    <nav
      aria-label="Post pages"
      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3"
    >
      <Button
        variant="secondary"
        size="sm"
        disabled={metadata.first || isLoading}
        onClick={() => onPageChange(metadata.page - 1)}
      >
        Previous
      </Button>
      <span className="text-sm text-gray-500">
        Page {metadata.page + 1} of {metadata.totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={metadata.last || isLoading}
        onClick={() => onPageChange(metadata.page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
