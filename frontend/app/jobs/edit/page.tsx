import { Suspense } from "react";
import EditJobPage from "@/components/jobs/EditJobPage";
import Skeleton from "@/components/ui/Skeleton";
export default function Page(){return <Suspense fallback={<Skeleton className="h-96"/>}><EditJobPage/></Suspense>;}
