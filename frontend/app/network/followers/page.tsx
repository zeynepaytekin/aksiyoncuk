import { Suspense } from "react";
import NetworkListPage from "@/components/network/NetworkListPage";
import Skeleton from "@/components/ui/Skeleton";

export default function Page() {
  return <Suspense fallback={<Skeleton className="h-72" />}>
    <NetworkListPage kind="followers" />
  </Suspense>;
}
