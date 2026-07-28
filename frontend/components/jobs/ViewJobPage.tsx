"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import JobCard from "@/components/jobs/JobCard";
import { ApiError } from "@/services/api/apiClient";
import { jobsService } from "@/services/api/jobs.service";
import { getJobErrorMessage } from "@/services/api/jobErrorMessage";
import type { Job } from "@/types/jobs";
import ApplyToJob from "@/components/jobs/ApplyToJob";

export default function ViewJobPage(){
  const id=useSearchParams().get("id")?.trim()??""; const [job,setJob]=useState<Job|null>(null);
  const [error,setError]=useState<ApiError|null>(null);
  useEffect(()=>{if(!id)return;let active=true;jobsService.getById(id).then((value)=>{if(active)setJob(value)})
    .catch((reason:unknown)=>{if(active)setError(reason instanceof ApiError?reason:new ApiError(0,"NETWORK_ERROR","Unable to load job."))});
    return()=>{active=false}},[id]);
  return <AppShell><section className="mx-auto max-w-3xl px-4 py-8">
    {!id&&<EmptyState title="Job ID required"/>}{id&&!job&&!error&&<Skeleton aria-label="Loading job" className="h-96"/>}
    {error&&<EmptyState title={error.code==="JOB_NOT_FOUND"?"Job not found":"Unable to load job"} description={getJobErrorMessage(error)}/>}
    {job&&<><JobCard job={job} ownerControls={job.ownedByCurrentUser}/>
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <ApplyToJob job={job} onApplied={() => setJob((value) => value
          ? { ...value, applicationCount: value.applicationCount + 1 } : value)} />
      </div></>}
  </section></AppShell>;
}
