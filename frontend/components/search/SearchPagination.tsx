"use client";

import Button from "@/components/ui/Button";

export default function SearchPagination({
  first,
  last,
  loading,
  page,
  totalPages,
  onPage,
}: {
  first: boolean;
  last: boolean;
  loading: boolean;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  return (
    <nav aria-label="Search result pagination" className="mt-6 flex justify-between">
      <Button
        variant="secondary"
        disabled={first || loading}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </Button>
      <span className="self-center text-sm text-gray-500">
        Page {page + 1} of {Math.max(1, totalPages)}
      </span>
      <Button
        variant="secondary"
        disabled={last || loading}
        onClick={() => onPage(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
