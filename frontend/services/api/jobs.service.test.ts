import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest } from "@/services/api/apiClient";
import { jobsService } from "@/services/api/jobs.service";

vi.mock("@/services/api/apiClient", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/services/api/apiClient")>();
  return { ...original, apiRequest: vi.fn() };
});
const request = vi.mocked(apiRequest);

describe("jobsService", () => {
  beforeEach(() => request.mockReset());
  it("maps global filters and pagination", async () => {
    request.mockResolvedValueOnce({});
    await jobsService.getGlobal({ page: 2, size: 10, status: "CLOSED", category: "PROFESSIONAL", workMode: "REMOTE" });
    expect(request).toHaveBeenCalledWith(
      "/jobs?page=2&size=10&status=CLOSED&category=PROFESSIONAL&workMode=REMOTE",
      { authenticated: true },
    );
  });
  it("maps my jobs and encoded single IDs", async () => {
    request.mockResolvedValue({});
    await jobsService.getMine({ status: "OPEN" });
    expect(request).toHaveBeenLastCalledWith("/jobs/me?status=OPEN", { authenticated: true });
    await jobsService.getById("job/id");
    expect(request).toHaveBeenLastCalledWith("/jobs/job%2Fid", { authenticated: true });
  });
  it("maps create and omits undefined PATCH while preserving null", async () => {
    request.mockResolvedValue({});
    const create = { title: "Editor", description: "Project", category: "PROFESSIONAL" as const,
      workMode: "REMOTE" as const, location: null, compensationType: "UNPAID" as const,
      compensationAmount: null, currency: null, applicationDeadline: null };
    await jobsService.create(create);
    expect(request).toHaveBeenLastCalledWith("/jobs", { method: "POST", authenticated: true, body: create });
    await jobsService.update("job/id", { title: undefined, location: null });
    expect(request).toHaveBeenLastCalledWith("/jobs/job%2Fid", {
      method: "PATCH", authenticated: true, body: { location: null },
    });
  });
  it("maps close, reopen, and 204 delete", async () => {
    request.mockResolvedValue({});
    await jobsService.close("job/id");
    expect(request).toHaveBeenLastCalledWith("/jobs/job%2Fid/close", { method: "POST", authenticated: true });
    await jobsService.reopen("job/id");
    expect(request).toHaveBeenLastCalledWith("/jobs/job%2Fid/reopen", { method: "POST", authenticated: true });
    request.mockResolvedValueOnce(undefined);
    await expect(jobsService.delete("job/id")).resolves.toBeUndefined();
  });
  it("preserves structured errors", async () => {
    const error = new ApiError(404, "JOB_NOT_FOUND", "Missing");
    request.mockRejectedValueOnce(error);
    await expect(jobsService.getById("missing")).rejects.toBe(error);
  });
});
