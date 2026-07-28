import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/services/api/apiClient";
import { authService } from "@/services/api/auth.service";
import { sessionStorage } from "@/services/auth/sessionStorage";
import { profileStateCoordinator } from "@/services/profile/profileStateCoordinator";
import { useAuthStore } from "@/store/auth.store";
import type { AuthResponse } from "@/types/auth";

vi.mock("@/services/api/auth.service", () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

const response: AuthResponse = {
  accessToken: "access",
  accessTokenExpiresAt: "2030-01-01T00:15:00Z",
  refreshToken: "refresh",
  refreshTokenExpiresAt: "2030-02-01T00:00:00Z",
  tokenType: "Bearer",
  user: {
    id: "user-id",
    email: "user@example.com",
    username: "creativeuser",
    fullName: "Creative User",
    status: "ACTIVE",
  },
};

describe("auth store", () => {
  beforeEach(() => {
    vi.mocked(authService.register).mockReset();
    vi.mocked(authService.login).mockReset();
    vi.mocked(authService.refresh).mockReset();
    vi.mocked(authService.logout).mockReset();
    useAuthStore.getState().clearSession();
    useAuthStore.setState({ isInitialized: false, status: "idle" });
  });

  it("logs in and keeps the access token out of browser storage", async () => {
    vi.mocked(authService.login).mockResolvedValue(response);
    await useAuthStore
      .getState()
      .login({ identifier: "user@example.com", password: "password" });
    expect(useAuthStore.getState().user).toEqual(response.user);
    expect(window.localStorage.getItem("aksiyoncuk_auth_session")).not.toContain(
      "access",
    );
  });

  it("registers then explicitly logs in with submitted credentials", async () => {
    vi.mocked(authService.register).mockResolvedValue({
      ...response.user,
      createdAt: "2030-01-01T00:00:00Z",
      profile: {
        professionalTitle: null,
        bio: null,
        location: null,
        websiteUrl: null,
      },
    });
    vi.mocked(authService.login).mockResolvedValue(response);
    const registration = {
      email: "user@example.com",
      username: "creativeuser",
      fullName: "Creative User",
      password: "StrongPassword123!",
    };
    await useAuthStore.getState().register(registration);
    expect(authService.register).toHaveBeenCalledWith(registration);
    expect(authService.login).toHaveBeenCalledWith({
      identifier: registration.email,
      password: registration.password,
    });
  });

  it("initializes by rotating a persisted refresh token", async () => {
    sessionStorage.write({
      refreshToken: "old-refresh",
      refreshTokenExpiresAt: "2030-01-01T00:00:00Z",
    });
    vi.mocked(authService.refresh).mockResolvedValue(response);
    await useAuthStore.getState().initialize();
    expect(authService.refresh).toHaveBeenCalledWith("old-refresh");
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("clears an invalid refresh session during initialization", async () => {
    sessionStorage.write({
      refreshToken: "invalid",
      refreshTokenExpiresAt: "2030-01-01T00:00:00Z",
    });
    vi.mocked(authService.refresh).mockRejectedValue(
      new ApiError(401, "INVALID_REFRESH_TOKEN", "Invalid"),
    );
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(sessionStorage.read()).toBeNull();
  });

  it("clears local state even when backend logout fails", async () => {
    vi.mocked(authService.login).mockResolvedValue(response);
    vi.mocked(authService.logout).mockRejectedValue(new Error("offline"));
    await useAuthStore
      .getState()
      .login({ identifier: "creativeuser", password: "password" });
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(sessionStorage.read()).toBeNull();
  });

  it("clears private profile state on logout", async () => {
    const clearPrivate = vi.fn();
    profileStateCoordinator.configure(clearPrivate);
    await useAuthStore.getState().logout();
    expect(clearPrivate).toHaveBeenCalled();
    profileStateCoordinator.configure(() => undefined);
  });
});
