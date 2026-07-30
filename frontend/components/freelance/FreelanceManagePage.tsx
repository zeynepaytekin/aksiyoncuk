"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FreelanceServiceForm from "./FreelanceServiceForm";
import MyFreelanceServicesPage from "./MyFreelanceServicesPage";
function Content() { return useSearchParams().get("service") ? <FreelanceServiceForm /> : <MyFreelanceServicesPage />; }
export default function FreelanceManagePage() { return <Suspense><Content /></Suspense>; }
