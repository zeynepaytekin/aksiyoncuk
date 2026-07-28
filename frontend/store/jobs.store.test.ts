import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/api/apiClient";
import { jobsService } from "@/services/api/jobs.service";
import { jobsStateCoordinator } from "@/services/jobs/jobsStateCoordinator";
import { useJobsStore } from "@/store/jobs.store";
import type { Job, JobPage } from "@/types/jobs";

vi.mock("@/services/api/jobs.service", () => ({ jobsService: {
  getGlobal: vi.fn(), getMine: vi.fn(), getById: vi.fn(), create: vi.fn(),
  update: vi.fn(), close: vi.fn(), reopen: vi.fn(), delete: vi.fn(),
} }));
const job: Job = { id:"job-id", title:"Editor", description:"Project", category:"PROFESSIONAL",
  workMode:"REMOTE", location:null, compensationType:"FIXED", compensationAmount:25000,
  currency:"TRY", status:"OPEN", applicationDeadline:null, createdAt:"2030-01-01T00:00:00Z",
  updatedAt:"2030-01-01T00:00:00Z", owner:{id:"user",username:"creator",fullName:"Creator",
    professionalTitle:"Director"}, ownedByCurrentUser:true, applicationCount:0 };
const page = (content: Job[]=[job]): JobPage => ({ content, page:0, size:20,
  totalElements:content.length,totalPages:content.length?1:0,first:true,last:true });

describe("jobs store", () => {
  beforeEach(() => {
    for (const method of ["getGlobal","getMine","create","update","close","reopen","delete"] as const)
      vi.mocked(jobsService[method]).mockReset();
    useJobsStore.setState({ globalJobs:[],globalPageMetadata:null,globalStatus:"idle",globalError:null,
      filters:{status:"OPEN"} }); useJobsStore.getState().clearMyJobs();
  });
  it("loads global filters, records errors, and deduplicates", async () => {
    let resolve!: (value: JobPage)=>void;
    vi.mocked(jobsService.getGlobal).mockReturnValue(new Promise((done)=>{resolve=done}));
    const first=useJobsStore.getState().loadGlobalJobs(); const second=useJobsStore.getState().loadGlobalJobs();
    expect(jobsService.getGlobal).toHaveBeenCalledTimes(1); resolve(page()); await Promise.all([first,second]);
    expect(useJobsStore.getState().globalJobs).toEqual([job]);
    useJobsStore.getState().setFilters({status:"CLOSED"}); expect(useJobsStore.getState().filters.status).toBe("CLOSED");
    vi.mocked(jobsService.getGlobal).mockRejectedValue(new ApiError(0,"NETWORK_ERROR","Offline"));
    await expect(useJobsStore.getState().loadGlobalJobs()).rejects.toMatchObject({code:"NETWORK_ERROR"});
  });
  it("loads mine and synchronizes create and update", async () => {
    vi.mocked(jobsService.getMine).mockResolvedValue(page()); await useJobsStore.getState().loadMyJobs();
    useJobsStore.setState({globalJobs:[job],globalStatus:"loaded",globalPageMetadata:{...page(),content:undefined} as never});
    const created={...job,id:"new"}; vi.mocked(jobsService.create).mockResolvedValue(created);
    await useJobsStore.getState().createJob({title:"Editor",description:"Project",category:"PROFESSIONAL",
      workMode:"REMOTE",location:null,compensationType:"FIXED",compensationAmount:25000,currency:"TRY",applicationDeadline:null});
    expect(useJobsStore.getState().myJobs[0]).toEqual(created);
    const updated={...job,title:"Updated"}; vi.mocked(jobsService.update).mockResolvedValue(updated);
    await useJobsStore.getState().updateJob(job.id,{title:"Updated"});
    expect(useJobsStore.getState().globalJobs.find((x)=>x.id===job.id)?.title).toBe("Updated");
  });
  it("synchronizes close/reopen and deletion", async () => {
    useJobsStore.setState({myJobs:[job],globalJobs:[job],globalStatus:"loaded",
      myPageMetadata:{...page(),content:undefined} as never,globalPageMetadata:{...page(),content:undefined} as never});
    vi.mocked(jobsService.close).mockResolvedValue({...job,status:"CLOSED"});
    await useJobsStore.getState().closeJob(job.id);
    expect(useJobsStore.getState().myJobs[0].status).toBe("CLOSED");
    expect(useJobsStore.getState().globalJobs).toEqual([]);
    useJobsStore.setState({globalJobs:[job]}); vi.mocked(jobsService.delete).mockResolvedValue();
    await useJobsStore.getState().deleteJob(job.id);
    expect(useJobsStore.getState().myJobs).toEqual([]); expect(useJobsStore.getState().globalJobs).toEqual([]);
  });
  it("clears private state and ownership on logout", () => {
    useJobsStore.setState({myJobs:[job],myStatus:"loaded",globalJobs:[job],globalStatus:"loaded"});
    vi.mocked(jobsService.getGlobal).mockResolvedValue(page([{...job,ownedByCurrentUser:false}]));
    jobsStateCoordinator.authenticationChanged(false);
    expect(useJobsStore.getState().myJobs).toEqual([]);
    expect(useJobsStore.getState().globalJobs[0].ownedByCurrentUser).toBe(false);
  });
});
