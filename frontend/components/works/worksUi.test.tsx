import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProfileWorksSection from "@/components/works/ProfileWorksSection";
import ViewWorkPage from "@/components/works/ViewWorkPage";
import WorkCard from "@/components/works/WorkCard";
import WorkForm from "@/components/works/WorkForm";
import { ApiError } from "@/services/api/apiClient";
import { worksService } from "@/services/api/works.service";
import { useWorksStore } from "@/store/works.store";
import type { Work, WorkPage } from "@/types/works";

const push = vi.fn();
let workId = "work-id";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams({ id: workId }),
}));
vi.mock("@/components/layout/AppShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
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
  title: "Backend Film",
  description: "Real description",
  workType: "SHORT_FILM",
  projectUrl: "https://example.com/work",
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

const page: WorkPage = {
  content: [work],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

describe("works UI", () => {
  beforeEach(() => {
    push.mockReset();
    workId = "work-id";
    vi.mocked(worksService.getMine).mockReset();
    vi.mocked(worksService.getPublicByUsername).mockReset();
    vi.mocked(worksService.getById).mockReset();
    vi.mocked(worksService.create).mockReset();
    vi.mocked(worksService.update).mockReset();
    vi.mocked(worksService.delete).mockReset();
    useWorksStore.getState().clearMyWorks();
    useWorksStore.getState().clearPublicWorks();
  });

  it("creates normalized backend values and exposes WorkType labels", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    render(
      <WorkForm
        isSaving={false}
        error=""
        onCancel={vi.fn()}
        onCreate={create}
      />,
    );
    expect(
      screen.getByRole("option", { name: "Short Film" }),
    ).toHaveValue("SHORT_FILM");
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "  Film  " },
    });
    fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "MUSIC_VIDEO" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "   " },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Save Work" }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        title: "Film",
        description: null,
        workType: "MUSIC_VIDEO",
        projectUrl: null,
        releaseYear: null,
      }),
    );
  });

  it("blocks invalid URLs and uses native loading state", async () => {
    const create = vi.fn();
    const { rerender } = render(
      <WorkForm
        isSaving={false}
        error=""
        onCancel={vi.fn()}
        onCreate={create}
      />,
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Film" },
    });
    fireEvent.change(screen.getByLabelText("Project URL"), {
      target: { value: "ftp://example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Save Work" }));
    expect(
      await screen.findByText(
        "Project URL must be an absolute HTTP or HTTPS URL.",
      ),
    ).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
    rerender(
      <WorkForm
        isSaving
        error=""
        onCancel={vi.fn()}
        onCreate={create}
      />,
    );
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });

  it("initializes editing, sends only changes, and preserves explicit null", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    render(
      <WorkForm
        initial={work}
        isSaving={false}
        error=""
        onCancel={vi.fn()}
        onUpdate={update}
      />,
    );
    expect(screen.getByLabelText("Title")).toHaveValue("Backend Film");
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "   " },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Save Work" }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ description: null }),
    );
  });

  it("loads and renders real private works with no mock seed", async () => {
    vi.mocked(worksService.getMine).mockResolvedValue(page);
    render(<ProfileWorksSection />);
    expect(screen.getByLabelText("Loading works")).toBeInTheDocument();
    expect(await screen.findByText("Backend Film")).toBeInTheDocument();
    expect(screen.queryByText("Video")).toBeNull();
    expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
  });

  it("renders the private empty state and pagination controls", async () => {
    vi.mocked(worksService.getMine).mockResolvedValue({
      ...page,
      content: [],
      totalElements: 0,
      totalPages: 0,
    });
    render(<ProfileWorksSection />);
    expect(
      await screen.findByText("You have not added any portfolio works yet."),
    ).toBeInTheDocument();
  });

  it("confirms owner deletion, removes it, and displays failures", async () => {
    useWorksStore.setState({ myWorks: [work] });
    vi.mocked(worksService.delete).mockResolvedValueOnce();
    const { rerender } = render(<WorkCard work={work} ownerControls />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete work" }));
    await waitFor(() => expect(worksService.delete).toHaveBeenCalledWith(work.id));

    useWorksStore.setState({
      myWorks: [work],
      deleteStatusById: {},
      deleteErrorById: {},
    });
    vi.mocked(worksService.delete).mockRejectedValueOnce(
      new ApiError(0, "NETWORK_ERROR", "Offline"),
    );
    rerender(<WorkCard work={work} ownerControls />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete work" }));
    expect(
      await screen.findByText("The server could not be reached. Please try again."),
    ).toBeInTheDocument();
  });

  it("public cards hide owner controls and single view handles safe data", async () => {
    const publicWork = { ...work, ownedByCurrentUser: false };
    vi.mocked(worksService.getById).mockResolvedValue(publicWork);
    render(<ViewWorkPage />);
    expect(await screen.findByText("Backend Film")).toBeInTheDocument();
    expect(screen.getByText(/@creator/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    expect(screen.queryByText(/email/i)).toBeNull();
  });

  it("single view renders a not-found state", async () => {
    vi.mocked(worksService.getById).mockRejectedValue(
      new ApiError(404, "WORK_NOT_FOUND", "Missing"),
    );
    render(<ViewWorkPage />);
    expect(await screen.findByText("Work not found")).toBeInTheDocument();
  });
});
