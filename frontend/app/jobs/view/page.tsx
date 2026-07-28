import { Suspense } from "react";
import ViewJobPage from "@/components/jobs/ViewJobPage";
import Skeleton from "@/components/ui/Skeleton";
export default function Page(){return <Suspense fallback={<Skeleton className="h-96"/>}><ViewJobPage/></Suspense>;}
