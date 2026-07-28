"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import JobForm from "@/components/jobs/JobForm";
import { ApiError } from "@/services/api/apiClient";
import { jobsService } from "@/services/api/jobs.service";
import { getJobErrorMessage } from "@/services/api/jobErrorMessage";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useJobsStore } from "@/store/jobs.store";
import type { Job, UpdateJobRequest } from "@/types/jobs";

export default function EditJobPage() {
  const router=useRouter(); const id=useSearchParams().get("id")?.trim() ?? "";
  const { isLoading: authLoading, user }=useRequireAuth(); const [job,setJob]=useState<Job|null>(null);
  const [error,setError]=useState<ApiError|null>(null); const [loading,setLoading]=useState(true);
  const update=useJobsStore((s)=>s.updateJob); const status=useJobsStore((s)=>s.updateStatusById[id]??"idle");
  const updateError=useJobsStore((s)=>s.updateErrorById[id]);
  useEffect(()=>{ if(authLoading||!user||!id)return; let active=true; jobsService.getById(id)
    .then((value)=>{if(active)setJob(value)}).catch((reason:unknown)=>{if(active)setError(reason instanceof ApiError?reason:new ApiError(0,"NETWORK_ERROR","Unable to load job."))})
    .finally(()=>{if(active)setLoading(false)}); return()=>{active=false}; },[authLoading,id,user]);
  let content;
  if(authLoading||(id&&loading)) content=<Skeleton aria-label="Loading job" className="h-96"/>;
  else if(!id) content=<EmptyState title="Job ID required"/>;
  else if(error) content=<EmptyState title={error.code==="JOB_NOT_FOUND"?"Job not found":"Unable to load job"} description={getJobErrorMessage(error)}/>;
  else if(job&&!job.ownedByCurrentUser) content=<EmptyState title="You cannot edit this job" description="Only the owner can update it."/>;
  else if(job) content=<Card padding="lg"><h1 className="mb-6 text-2xl font-bold">Edit Job</h1>
    <JobForm initial={job} saving={status==="loading"} error={updateError?getJobErrorMessage(updateError):""}
      onCancel={()=>router.push("/profile")} onUpdate={async(request:UpdateJobRequest)=>{
        if(Object.keys(request).length===0){router.push("/profile");return}
        try{await update(id,request);router.push("/profile")}catch{}
      }}/></Card>;
  return <AppShell><section className="mx-auto max-w-3xl px-4 py-8">{content}</section></AppShell>;
}
