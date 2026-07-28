import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ApplicationCard from "@/components/jobs/ApplicationCard";
import ApplyToJob from "@/components/jobs/ApplyToJob";
import { useAuthStore } from "@/store/auth.store";
import { useJobApplicationsStore } from "@/store/jobApplications.store";
import type { JobApplication } from "@/types/jobApplications";
import type { Job } from "@/types/jobs";

const job: Job = {
  id: "job", title: "Editor", description: "Project", category: "PROFESSIONAL",
  workMode: "REMOTE", location: null, compensationType: "UNPAID",
  compensationAmount: null, currency: null, status: "OPEN",
  applicationDeadline: null, createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  owner: { id: "owner", username: "owner", fullName: "Owner", professionalTitle: null },
  ownedByCurrentUser: false, applicationCount: 3,
};
const application: JobApplication = {
  id: "application", status: "SUBMITTED", coverLetter: "Hello",
  appliedAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  withdrawnAt: null, reviewedAt: null,
  job: { id: job.id, title: job.title, status: job.status, owner: job.owner },
  applicant: { id: "applicant", username: "applicant", fullName: "Applicant", professionalTitle: "Editor" },
  ownedByCurrentApplicant: true, manageableByCurrentJobOwner: false,
};

describe("job application UI", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
    useJobApplicationsStore.getState().clearPrivateApplications();
  });

  it("offers sign-in without an authenticated apply action", () => {
    render(<ApplyToJob job={job} />);
    expect(screen.getByRole("link", { name: "Sign in to apply" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();
  });

  it("hides apply for owners and closed jobs", () => {
    useAuthStore.setState({ user: { id: "owner", email: "owner@example.com", username: "owner",
      fullName: "Owner", status: "ACTIVE" } });
    const { rerender } = render(<ApplyToJob job={{ ...job, ownedByCurrentUser: true }} />);
    expect(screen.getByText("This is your listing.")).toBeInTheDocument();
    rerender(<ApplyToJob job={{ ...job, status: "CLOSED" }} />);
    expect(screen.getByText("Applications are closed.")).toBeInTheDocument();
  });

  it("submits a blank cover letter as null and clears the form", async () => {
    useAuthStore.setState({ user: { id: "applicant", email: "a@example.com", username: "applicant",
      fullName: "Applicant", status: "ACTIVE" } });
    const apply = vi.fn().mockResolvedValue(application);
    useJobApplicationsStore.setState({ applyToJob: apply });
    render(<ApplyToJob job={job} />);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit application" }));
    await waitFor(() => expect(apply).toHaveBeenCalledWith("job", null));
    expect(screen.getByText("Application submitted.")).toBeInTheDocument();
  });

  it("shows only allowed submitted transition controls", () => {
    render(<ApplicationCard application={application} />);
    expect(screen.getByRole("button", { name: "Withdraw" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    const { rerender } = render(<ApplicationCard application={{
      ...application, ownedByCurrentApplicant: false, manageableByCurrentJobOwner: true,
    }} />);
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    rerender(<ApplicationCard application={{ ...application, status: "ACCEPTED" }} />);
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
  });
});
