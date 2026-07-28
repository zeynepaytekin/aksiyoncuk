import Button from "@/components/ui/Button";
import type { NetworkPageMetadata } from "@/types/network";

export default function NetworkPagination({
  metadata, loading, onPage,
}: {
  metadata: NetworkPageMetadata | null;
  loading: boolean;
  onPage: (page: number) => void;
}) {
  if (!metadata || metadata.totalPages <= 1) return null;
  return <nav aria-label="Network pagination" className="mt-5 flex items-center justify-between">
    <Button size="sm" variant="secondary" disabled={loading || metadata.first}
      onClick={() => onPage(metadata.page - 1)}>Previous</Button>
    <span className="text-sm text-gray-500">Page {metadata.page + 1} of {metadata.totalPages}</span>
    <Button size="sm" variant="secondary" disabled={loading || metadata.last}
      onClick={() => onPage(metadata.page + 1)}>Next</Button>
  </nav>;
}
