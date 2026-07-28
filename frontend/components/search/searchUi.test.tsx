import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SearchPostCard, SearchUserCard } from "@/components/search/SearchUi";

describe("search result cards", () => {
  it("renders safe user fields and an accessible follow action", () => {
    const toggle = vi.fn();
    render(
      <SearchUserCard
        user={{
          id: "other",
          username: "creativeuser",
          fullName: "Creative User",
          professionalTitle: "Director",
          location: "Istanbul",
          followerCount: 42,
          followingCount: 18,
          followedByCurrentUser: false,
        }}
        currentUserId="viewer"
        onToggle={toggle}
      />,
    );
    expect(screen.getByText("42 followers · 18 following")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Follow" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(toggle).toHaveBeenCalledOnce();
    expect(screen.queryByText(/email/i)).not.toBeInTheDocument();
  });

  it("renders post counts and prevents anonymous like actions", () => {
    const toggle = vi.fn();
    render(
      <SearchPostCard
        authenticated={false}
        onToggleLike={toggle}
        post={{
          id: "post-1",
          content: "Search result content",
          createdAt: "2026-07-28T18:00:00Z",
          updatedAt: "2026-07-28T18:00:00Z",
          author: {
            id: "author",
            username: "creator",
            fullName: "Creator",
            professionalTitle: "Editor",
          },
          ownedByCurrentUser: false,
          commentCount: 3,
          likeCount: 4,
          likedByCurrentUser: false,
        }}
      />,
    );
    expect(screen.getByText("Comments (3)")).toBeInTheDocument();
    const like = screen.getByRole("button", { name: "Like post, 4 likes" });
    expect(like).toBeDisabled();
    fireEvent.click(like);
    expect(toggle).not.toHaveBeenCalled();
  });
});
