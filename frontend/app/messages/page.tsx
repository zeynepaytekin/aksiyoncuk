import { Suspense } from "react";
import MessagingPage from "@/components/messaging/MessagingPage";
import Skeleton from "@/components/ui/Skeleton";

export default function Page() {
  return <Suspense fallback={<Skeleton className="h-96" />}><MessagingPage /></Suspense>;
}
