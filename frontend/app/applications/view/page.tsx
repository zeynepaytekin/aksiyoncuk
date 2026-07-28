import { Suspense } from "react";
import ViewApplicationPage from "@/components/jobs/ViewApplicationPage";
import Skeleton from "@/components/ui/Skeleton";

export default function Page() {
  return <Suspense fallback={<Skeleton className="h-72" />}><ViewApplicationPage /></Suspense>;
}
