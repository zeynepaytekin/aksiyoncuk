import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiRequest } from "@/services/api/apiClient";
import { notificationsService } from "@/services/api/notifications.service";

vi.mock("@/services/api/apiClient", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/services/api/apiClient")>();
  return { ...original, apiRequest: vi.fn() };
});

const request = vi.mocked(apiRequest);

describe("notifications service", () => {
  beforeEach(() => request.mockReset());

  it("maps list filters and supplied pagination", async () => {
    request.mockResolvedValue({});
    await notificationsService.getAll({
      page: 2,
      size: 10,
      unreadOnly: true,
      type: "POST_LIKED",
    });
    expect(request).toHaveBeenCalledWith(
      "/notifications?page=2&size=10&unreadOnly=true&type=POST_LIKED",
      { authenticated: true },
    );
  });

  it("omits unsupplied list parameters and maps summary", async () => {
    request.mockResolvedValue({});
    await notificationsService.getAll();
    await notificationsService.getSummary();
    expect(request).toHaveBeenNthCalledWith(1, "/notifications", {
      authenticated: true,
    });
    expect(request).toHaveBeenNthCalledWith(2, "/notifications/summary", {
      authenticated: true,
    });
  });

  it("maps encoded read, unread, and bulk requests", async () => {
    request.mockResolvedValue({});
    await notificationsService.markRead("notice/id");
    await notificationsService.markUnread("notice/id");
    await notificationsService.markAllRead();
    expect(request).toHaveBeenNthCalledWith(
      1,
      "/notifications/notice%2Fid/read",
      { method: "POST", authenticated: true },
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      "/notifications/notice%2Fid/unread",
      { method: "POST", authenticated: true },
    );
    expect(request).toHaveBeenNthCalledWith(
      3,
      "/notifications/read-all",
      { method: "POST", authenticated: true },
    );
  });

  it("preserves structured errors", async () => {
    const error = new ApiError(
      400,
      "INVALID_NOTIFICATION_TYPE",
      "Invalid type",
    );
    request.mockImplementationOnce(() => Promise.reject(error));
    await expect(
      notificationsService.getAll({ type: "POST_LIKED" }),
    ).rejects.toMatchObject({
      code: "INVALID_NOTIFICATION_TYPE",
      status: 400,
    });
  });
});
