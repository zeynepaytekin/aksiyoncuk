import { Suspense } from "react";

import CombinedSearchPage from "@/components/search/CombinedSearchPage";

export default function Page() {
  return (
    <Suspense>
      <CombinedSearchPage />
    </Suspense>
  );
}
