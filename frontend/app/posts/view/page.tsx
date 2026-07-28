import { Suspense } from "react";

import ViewPostPage from "@/components/feed/ViewPostPage";
import Skeleton from "@/components/ui/Skeleton";

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-72" />}>
      <ViewPostPage />
    </Suspense>
  );
}
