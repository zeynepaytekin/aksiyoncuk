import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FreelanceCancellationHistory from "./FreelanceCancellationHistory";
import ServicePortfolioWorks from "./ServicePortfolioWorks";
import type { FreelanceCancellationRequest } from "@/types/freelance";

describe("marketplace stabilization UI", () => {
  it("renders deterministic resolved cancellation history and omits pending requests", () => {
    const requests: FreelanceCancellationRequest[] = [
      {
        id: "rejected",
        requestedRole: "BUYER",
        reason: "The project scope changed substantially.",
        status: "REJECTED",
        previousOrderStatus: "IN_PROGRESS",
        resolverRole: "SELLER",
        createdAt: "2026-01-01T00:00:00Z",
        resolvedAt: "2026-01-02T00:00:00Z",
      },
      {
        id: "pending",
        requestedRole: "SELLER",
        reason: "This request remains pending.",
        status: "PENDING",
        previousOrderStatus: "DELIVERED",
        resolverRole: null,
        createdAt: "2026-01-03T00:00:00Z",
        resolvedAt: null,
      },
    ];
    render(<FreelanceCancellationHistory requests={requests} />);
    expect(screen.getByText(/cancellation rejected/i)).toBeInTheDocument();
    expect(screen.getByText(/resolved by seller/i)).toBeInTheDocument();
    expect(screen.queryByText(/remains pending/i)).not.toBeInTheDocument();
  });

  it("renders public work thumbnails and a nullable fallback safely", () => {
    render(
      <ServicePortfolioWorks
        works={[
          { id: "image", title: "Image work", thumbnailUrl: "https://media.test/image.jpg", displayOrder: 0 },
          { id: "fallback", title: "Fallback work", thumbnailUrl: null, displayOrder: 1 },
        ]}
      />,
    );
    expect(
      screen.getByAltText("Image work portfolio thumbnail").getAttribute("src"),
    ).toContain(encodeURIComponent("https://media.test/image.jpg"));
    expect(screen.getByText("No work image")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Image work/i })).toHaveAttribute(
      "href",
      "/works/view?id=image",
    );
  });
});
