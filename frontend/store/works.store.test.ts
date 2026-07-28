import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/services/api/apiClient";
import { worksService } from "@/services/api/works.service";
import { worksStateCoordinator } from "@/services/works/worksStateCoordinator";
import { useWorksStore } from "@/store/works.store";
import type { Work, WorkPage } from "@/types/works";

vi.mock("@/services/api/works.service", () => ({
  worksService: {
    getMine: vi.fn(),
    getPublicByUsername: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const work: Work = {
  id: "work-id",
  title: "Real Work",
  description: "Description",
  workType: "SHORT_FILM",
  projectUrl: "https://example.com",
  releaseYear: 2026,
  createdAt: "2030-01-01T00:00:00Z",
  updatedAt: "2030-01-01T00:00:00Z",
  owner: {
    id: "user-id",
    username: "creator",
    fullName: "Creative User",
    professionalTitle: "Director",
  },
  ownedByCurrentUser: true,
};

function page(content: Work[] = [work]): WorkPage {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    first: true,
    last: true,
  };
}

describe("works store", () => {
  beforeEach(() => {
    vi.mocked(worksService.getMine).mockReset();
    vi.mocked(worksService.getPublicByUsername).mockReset();
    vi.mocked(worksService.create).mockReset();
    vi.mocked(worksService.update).mockReset();
    vi.mocked(worksService.delete).mockReset();
    useWorksStore.getState().clearMyWorks();
    useWorksStore.getState().clearPublicWorks();
  });

  it("loads private works and metadata", async () => {
    vi.mocked(worksService.getMine).mockResolvedValue(page());
    await useWorksStore.getState().loadMyWorks();
    expect(useWorksStore.getState().myWorks).toEqual([work]);
    expect(useWorksStore.getState().myPageMetadata?.totalElements).toBe(1);
  });

  it("records private load failures", async () => {
    vi.mocked(worksService.getMine).mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "Offline"),
    );
    await expect(useWorksStore.getState().loadMyWorks()).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
    expect(useWorksStore.getState().myStatus).toBe("error");
  });

  it("deduplicates concurrent private loads", async () => {
    let resolve!: (page: WorkPage) => void;
    vi.mocked(worksService.getMine).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const first = useWorksStore.getState().loadMyWorks();
    const second = useWorksStore.getState().loadMyWorks();
    expect(worksService.getMine).toHaveBeenCalledTimes(1);
    resolve(page());
    await Promise.all([first, second]);
  });

  it("normalizes and caches public works", async () => {
    vi.mocked(worksService.getPublicByUsername).mockResolvedValue(page());
    await useWorksStore.getState().loadPublicWorks(" Creator ");
    expect(worksService.getPublicByUsername).toHaveBeenCalledWith("creator", {
      page: 0,
      size: 20,
    });
    expect(useWorksStore.getState().publicWorksByUsername.creator).toEqual([
      work,
    ]);
  });

  it("inserts creation into a loaded private page", async () => {
    useWorksStore.setState({
      myStatus: "loaded",
      myWorks: [],
      myPageMetadata: { ...page([]), content: undefined } as never,
    });
    vi.mocked(worksService.create).mockResolvedValue(work);
    await useWorksStore.getState().createWork({
      title: work.title,
      description: work.description,
      workType: work.workType,
      projectUrl: work.projectUrl,
      releaseYear: work.releaseYear,
    });
    expect(useWorksStore.getState().myWorks).toEqual([work]);
    expect(useWorksStore.getState().myPageMetadata?.totalElements).toBe(1);
  });

  it("updates private and every loaded public cache", async () => {
    const updated = { ...work, title: "Updated" };
    useWorksStore.setState({
      myWorks: [work],
      publicWorksByUsername: { creator: [work], other: [work] },
    });
    vi.mocked(worksService.update).mockResolvedValue(updated);
    await useWorksStore.getState().updateWork(work.id, { title: "Updated" });
    expect(useWorksStore.getState().myWorks[0].title).toBe("Updated");
    expect(
      useWorksStore.getState().publicWorksByUsername.creator[0].title,
    ).toBe("Updated");
    expect(useWorksStore.getState().publicWorksByUsername.other[0].title).toBe(
      "Updated",
    );
  });

  it("deletes from every cache and adjusts metadata", async () => {
    useWorksStore.setState({
      myWorks: [work],
      myPageMetadata: { ...page(), content: undefined } as never,
      publicWorksByUsername: { creator: [work] },
      publicPageMetadataByUsername: {
        creator: { ...page(), content: undefined } as never,
      },
    });
    vi.mocked(worksService.delete).mockResolvedValue();
    await useWorksStore.getState().deleteWork(work.id);
    expect(useWorksStore.getState().myWorks).toEqual([]);
    expect(useWorksStore.getState().publicWorksByUsername.creator).toEqual([]);
    expect(useWorksStore.getState().myPageMetadata?.totalElements).toBe(0);
    expect(
      useWorksStore.getState().publicPageMetadataByUsername.creator
        ?.totalElements,
    ).toBe(0);
  });

  it("clears private state and refreshes public ownership on auth changes", async () => {
    useWorksStore.setState({
      myWorks: [work],
      myStatus: "loaded",
      publicWorksByUsername: { creator: [work] },
      publicStatusByUsername: { creator: "loaded" },
    });
    vi.mocked(worksService.getPublicByUsername).mockResolvedValue(
      page([{ ...work, ownedByCurrentUser: false }]),
    );
    worksStateCoordinator.authenticationChanged(false);
    expect(useWorksStore.getState().myWorks).toEqual([]);
    expect(
      useWorksStore.getState().publicWorksByUsername.creator[0]
        .ownedByCurrentUser,
    ).toBe(false);
    await vi.waitFor(() =>
      expect(worksService.getPublicByUsername).toHaveBeenCalled(),
    );
  });
});
