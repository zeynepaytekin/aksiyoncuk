import { Suspense } from "react";

import EditWorkPage from "@/components/works/EditWorkPage";
import Skeleton from "@/components/ui/Skeleton";

export default function EditWorkRoute() {
  return (
    <Suspense fallback={<Skeleton aria-label="Loading work" className="h-96" />}>
      <EditWorkPage />
    </Suspense>
  );
}
