import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import JobForm from "@/components/jobs/JobForm";
import JobCard from "@/components/jobs/JobCard";
import { formatJobCompensation } from "@/utils/formatCompensation";
import type { Job } from "@/types/jobs";

const job: Job = { id:"job",title:"Backend Job",description:"Real project",category:"PROFESSIONAL",
  workMode:"REMOTE",location:"Istanbul",compensationType:"FIXED",compensationAmount:25000,currency:"TRY",
  status:"OPEN",applicationDeadline:null,createdAt:"2030-01-01T00:00:00Z",updatedAt:"2030-01-01T00:00:00Z",
  owner:{id:"user",username:"creator",fullName:"Creative User",professionalTitle:"Director"},ownedByCurrentUser:false };

describe("jobs UI",()=>{
  it("validates fixed compensation and normalizes currency",async()=>{
    const create=vi.fn().mockResolvedValue(undefined);
    render(<JobForm saving={false} error="" onCancel={vi.fn()} onCreate={create}/>);
    fireEvent.change(screen.getByLabelText("Title"),{target:{value:" Editor "}});
    fireEvent.change(screen.getByLabelText("Description"),{target:{value:" Project "}});
    fireEvent.change(screen.getByLabelText("Compensation"),{target:{value:"FIXED"}});
    fireEvent.submit(screen.getByRole("button",{name:"Save Job"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("positive amount");
    fireEvent.change(screen.getByLabelText("Amount"),{target:{value:"25000"}});
    fireEvent.change(screen.getByLabelText("Currency"),{target:{value:"try"}});
    fireEvent.submit(screen.getByRole("button",{name:"Save Job"}));
    await waitFor(()=>expect(create).toHaveBeenCalledWith(expect.objectContaining({title:"Editor",currency:"TRY",compensationAmount:25000})));
  });
  it("formats compensation and hides owner controls for public viewers",()=>{
    expect(formatJobCompensation(job)).toContain("₺");
    expect(formatJobCompensation({...job,compensationType:"UNPAID"})).toBe("Unpaid");
    render(<JobCard job={job} ownerControls/>);
    expect(screen.getByText("Backend Job")).toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });
});
