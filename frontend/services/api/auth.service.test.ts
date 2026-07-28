import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/services/api/apiClient";
import { authService } from "@/services/api/auth.service";

vi.mock("@/services/api/apiClient", () => ({
  apiRequest: vi.fn(),
}));

const request = vi.mocked(apiRequest);

describe("authService", () => {
  beforeEach(() => request.mockReset());

  it("maps registration to the backend contract", async () => {
    request.mockResolvedValueOnce({ id: "user-id" });
    const body = {
      email: "user@example.com",
      username: "creativeuser",
      password: "StrongPassword123!",
      fullName: "Creative User",
    };
    await authService.register(body);
    expect(request).toHaveBeenCalledWith("/auth/register", {
      method: "POST",
      body,
      skipRefresh: true,
    });
  });

  it("maps login with a generic identifier", async () => {
    request.mockResolvedValueOnce({});
    const body = { identifier: "creativeuser", password: "secret" };
    await authService.login(body);
    expect(request).toHaveBeenCalledWith("/auth/login", {
      method: "POST",
      body,
      skipRefresh: true,
    });
  });

  it("maps refresh and logout tokens without logging or transforming them", async () => {
    request.mockResolvedValue({});
    await authService.refresh("raw-refresh");
    await authService.logout("raw-refresh");
    expect(request).toHaveBeenNthCalledWith(
      1,
      "/auth/refresh",
      expect.objectContaining({ body: { refreshToken: "raw-refresh" } }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      "/auth/logout",
      expect.objectContaining({ body: { refreshToken: "raw-refresh" } }),
    );
  });
});
