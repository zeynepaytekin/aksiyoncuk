import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/services/api/apiClient";
import { sessionCoordinator } from "@/services/auth/sessionCoordinator";

describe("apiRequest", () => {
  beforeEach(() => {
    sessionCoordinator.setAccessToken(null);
    vi.unstubAllGlobals();
  });

  it("parses structured validation errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: "VALIDATION_ERROR",
            message: "Invalid request",
            fieldErrors: [{ field: "email", message: "must be valid" }],
          }),
          { status: 400 },
        ),
      ),
    );
    await expect(apiRequest("/auth/register")).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      fieldErrors: [{ field: "email", message: "must be valid" }],
    });
  });

  it("handles 204 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    await expect(apiRequest("/auth/logout")).resolves.toBeUndefined();
  });

  it("uses one refresh promise for concurrent 401 responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ id: "user-id" }), { status: 200 }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const refresh = vi.fn(async () => {
      await Promise.resolve();
      sessionCoordinator.setAccessToken("new-access");
      return "new-access";
    });
    sessionCoordinator.configure(refresh, vi.fn());

    await Promise.all([
      apiRequest("/auth/me", { authenticated: true }),
      apiRequest("/auth/me", { authenticated: true }),
    ]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("surfaces network failures as typed errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(apiRequest("/health")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      status: 0,
    });
  });
});
