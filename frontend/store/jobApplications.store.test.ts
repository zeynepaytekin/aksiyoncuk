import { beforeEach, describe, expect, it, vi } from "vitest";
import { jobApplicationsService } from "@/services/api/jobApplications.service";
import { useJobApplicationsStore } from "@/store/jobApplications.store";
import type { JobApplication, JobApplicationPage } from "@/types/jobApplications";

vi.mock("@/services/api/jobApplications.service", () => ({
  jobApplicationsService: {
    apply: vi.fn(), getMine: vi.fn(), getForJob: vi.fn(), getById: vi.fn(),
    withdraw: vi.fn(), accept: vi.fn(), reject: vi.fn(),
  },
}));

const application: JobApplication = {
  id: "application-1", status: "SUBMITTED", coverLetter: null,
  appliedAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  withdrawnAt: null, reviewedAt: null,
  job: { id: "job-1", title: "Editor", status: "OPEN",
    owner: { id: "owner", username: "owner", fullName: "Owner", professionalTitle: null } },
  applicant: { id: "applicant", username: "applicant", fullName: "Applicant", professionalTitle: "Editor" },
  ownedByCurrentApplicant: true, manageableByCurrentJobOwner: false,
};
const page: JobApplicationPage = {
  content: [application], page: 0, size: 20, totalElements: 1,
  totalPages: 1, first: true, last: true,
};

describe("job applications store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useJobApplicationsStore.getState().clearPrivateApplications();
  });

  it("loads mine and prevents duplicate requests", async () => {
    let resolve!: (value: JobApplicationPage) => void;
    vi.mocked(jobApplicationsService.getMine).mockReturnValue(
      new Promise((done) => { resolve = done; }),
    );
    const first = useJobApplicationsStore.getState().loadMyApplications();
    const second = useJobApplicationsStore.getState().loadMyApplications();
    expect(jobApplicationsService.getMine).toHaveBeenCalledTimes(1);
    resolve(page);
    await Promise.all([first, second]);
    expect(useJobApplicationsStore.getState().myApplications).toEqual([application]);
  });

  it("loads the owner cache", async () => {
    vi.mocked(jobApplicationsService.getForJob).mockResolvedValue(page);
    await useJobApplicationsStore.getState().loadApplicationsForJob("job-1");
    expect(useJobApplicationsStore.getState().applicationsByJobId["job-1"]).toEqual([application]);
  });

  it("inserts a successful apply into a loaded applicant page", async () => {
    useJobApplicationsStore.setState({
      myStatus: "loaded", myApplications: [],
      myPageMetadata: { page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true },
    });
    vi.mocked(jobApplicationsService.apply).mockResolvedValue(application);
    await useJobApplicationsStore.getState().applyToJob("job-1", null);
    expect(useJobApplicationsStore.getState().myApplications).toEqual([application]);
    expect(useJobApplicationsStore.getState().myPageMetadata?.totalElements).toBe(1);
  });

  it.each([
    ["withdrawApplication", "withdraw", "WITHDRAWN"],
    ["acceptApplication", "accept", "ACCEPTED"],
    ["rejectApplication", "reject", "REJECTED"],
  ] as const)("synchronizes %s", async (action, service, status) => {
    const changed = { ...application, status };
    useJobApplicationsStore.setState({
      myApplications: [application],
      applicationsByJobId: { "job-1": [application] },
    });
    vi.mocked(jobApplicationsService[service]).mockResolvedValue(changed);
    await useJobApplicationsStore.getState()[action]("application-1");
    expect(useJobApplicationsStore.getState().myApplications[0].status).toBe(status);
    expect(useJobApplicationsStore.getState().applicationsByJobId["job-1"][0].status).toBe(status);
  });

  it("clears private state", () => {
    useJobApplicationsStore.setState({
      myApplications: [application],
      applicationsByJobId: { "job-1": [application] },
      applyStatusByJobId: { "job-1": "loading" },
    });
    useJobApplicationsStore.getState().clearPrivateApplications();
    expect(useJobApplicationsStore.getState().myApplications).toEqual([]);
    expect(useJobApplicationsStore.getState().applicationsByJobId).toEqual({});
    expect(useJobApplicationsStore.getState().applyStatusByJobId).toEqual({});
  });
});
