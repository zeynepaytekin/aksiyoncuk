import { Suspense } from "react";

import Skeleton from "@/components/ui/Skeleton";
import ViewWorkPage from "@/components/works/ViewWorkPage";

export default function ViewWorkRoute() {
  return (
    <Suspense fallback={<Skeleton aria-label="Loading work" className="h-96" />}>
      <ViewWorkPage />
    </Suspense>
  );
}
