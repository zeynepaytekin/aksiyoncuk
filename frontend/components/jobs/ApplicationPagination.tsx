import Button from "@/components/ui/Button";
import type { JobApplicationPageMetadata } from "@/types/jobApplications";

export default function ApplicationPagination({
  metadata,
  loading,
  onPage,
}: {
  metadata: JobApplicationPageMetadata | null;
  loading: boolean;
  onPage: (page: number) => void;
}) {
  if (!metadata || metadata.totalPages <= 1) return null;
  return (
    <nav aria-label="Applications pagination" className="mt-5 flex items-center justify-between">
      <Button variant="secondary" size="sm" disabled={loading || metadata.first}
        onClick={() => onPage(metadata.page - 1)}>Previous</Button>
      <span className="text-sm text-gray-500">
        Page {metadata.page + 1} of {metadata.totalPages}
      </span>
      <Button variant="secondary" size="sm" disabled={loading || metadata.last}
        onClick={() => onPage(metadata.page + 1)}>Next</Button>
    </nav>
  );
}
