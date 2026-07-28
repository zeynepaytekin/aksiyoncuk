import { beforeEach, describe, expect, it, vi } from "vitest";
import { jobApplicationsService } from "@/services/api/jobApplications.service";

const request = vi.fn();
vi.mock("@/services/api/apiClient", () => ({
  apiRequest: (...args: unknown[]) => request(...args),
}));

describe("jobApplicationsService", () => {
  beforeEach(() => request.mockReset());

  it("maps apply and encodes the job id", async () => {
    request.mockResolvedValue({});
    await jobApplicationsService.apply("job/id", { coverLetter: null });
    expect(request).toHaveBeenCalledWith("/jobs/job%2Fid/applications", {
      method: "POST", authenticated: true, body: { coverLetter: null },
    });
  });

  it("serializes pagination and status", async () => {
    request.mockResolvedValue({});
    await jobApplicationsService.getMine({ page: 2, size: 10, status: "ACCEPTED" });
    expect(request).toHaveBeenCalledWith(
      "/job-applications/me?page=2&size=10&status=ACCEPTED",
      { authenticated: true },
    );
  });

  it("maps owner and single requests with encoded ids", async () => {
    request.mockResolvedValue({});
    await jobApplicationsService.getForJob("job id", { status: "SUBMITTED" });
    await jobApplicationsService.getById("app/id");
    expect(request).toHaveBeenNthCalledWith(1,
      "/jobs/job%20id/applications?status=SUBMITTED", { authenticated: true });
    expect(request).toHaveBeenNthCalledWith(2,
      "/job-applications/app%2Fid", { authenticated: true });
  });

  it.each(["withdraw", "accept", "reject"] as const)("maps %s", async (action) => {
    request.mockResolvedValue({});
    await jobApplicationsService[action]("app id");
    expect(request).toHaveBeenCalledWith(
      `/job-applications/app%20id/${action}`,
      { method: "POST", authenticated: true },
    );
  });

});
