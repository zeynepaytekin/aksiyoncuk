import Button from "@/components/ui/Button";
import type { WorkPageMetadata } from "@/types/works";

type Props = {
  metadata: WorkPageMetadata | null | undefined;
  isLoading: boolean;
  onPageChange: (page: number) => void;
};

export default function WorkPagination({
  metadata,
  isLoading,
  onPageChange,
}: Props) {
  if (!metadata || metadata.totalPages <= 1) return null;
  return (
    <nav aria-label="Work pages" className="mt-4 flex items-center justify-between">
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
