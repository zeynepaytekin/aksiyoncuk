import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "@/components/auth/LoginPage";
import RegisterPage from "@/components/auth/RegisterPage";
import { ApiError } from "@/services/api/apiClient";
import type { AuthUser } from "@/types/auth";

const replace = vi.fn();
const push = vi.fn();
const state = {
  user: null as AuthUser | null,
  isLoading: false,
  isInitialized: true,
  status: "unauthenticated",
  login: vi.fn(),
  register: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

vi.mock("@/store/auth.store", () => ({
  useAuthStore: (selector: (value: typeof state) => unknown) => selector(state),
}));

describe("authentication pages", () => {
  beforeEach(() => {
    state.user = null;
    state.isLoading = false;
    state.isInitialized = true;
    state.status = "unauthenticated";
    state.login.mockReset();
    state.register.mockReset();
    replace.mockReset();
    push.mockReset();
  });

  it("shows a login loading state", () => {
    state.isLoading = true;
    render(<LoginPage />);
    expect(
      screen.getByRole("button", { name: "Signing in…" }),
    ).toBeDisabled();
  });

  it("shows a generic invalid-credentials error", async () => {
    state.login.mockRejectedValue(
      new ApiError(401, "INVALID_CREDENTIALS", "Invalid credentials"),
    );
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email or username"), {
      target: { value: "unknown" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    expect(
      await screen.findByText(
        "The email, username, or password is incorrect.",
      ),
    ).toBeInTheDocument();
  });

  it("displays a duplicate registration error", async () => {
    state.register.mockRejectedValue(
      new ApiError(409, "EMAIL_ALREADY_EXISTS", "Duplicate"),
    );
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Creative User" },
    });
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "creativeuser" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "StrongPassword123!" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create Account" }));
    expect(
      await screen.findByText("An account with this email already exists."),
    ).toBeInTheDocument();
  });

  it("redirects an authenticated visitor away from login", async () => {
    state.user = {
      id: "user-id",
      email: "user@example.com",
      username: "creativeuser",
      fullName: "Creative User",
      status: "ACTIVE",
    };
    state.status = "authenticated";
    render(<LoginPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
  });
});
