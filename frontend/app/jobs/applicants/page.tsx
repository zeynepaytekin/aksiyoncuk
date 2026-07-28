import { Suspense } from "react";
import JobApplicantsPage from "@/components/jobs/JobApplicantsPage";
import Skeleton from "@/components/ui/Skeleton";

export default function Page() {
  return <Suspense fallback={<Skeleton className="h-72" />}><JobApplicantsPage /></Suspense>;
}
