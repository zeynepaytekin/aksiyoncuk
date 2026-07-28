import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useRequireAuth } from "@/hooks/useRequireAuth";

const replace = vi.fn();
const state = {
  user: null,
  isLoading: false,
  isInitialized: true,
  status: "unauthenticated",
  logout: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));
vi.mock("@/store/auth.store", () => ({
  useAuthStore: (selector: (value: typeof state) => unknown) => selector(state),
}));

describe("useRequireAuth", () => {
  it("redirects an initialized unauthenticated visitor", async () => {
    renderHook(() => useRequireAuth());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("does not redirect while initialization is pending", () => {
    replace.mockClear();
    state.isInitialized = false;
    state.status = "initializing";
    const { result } = renderHook(() => useRequireAuth());
    expect(result.current.isLoading).toBe(true);
    expect(replace).not.toHaveBeenCalled();
  });
});
