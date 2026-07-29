import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";
import { mediaService } from "./media.service";

vi.mock("./apiClient", async (importOriginal) => {
  const original = await importOriginal<typeof import("./apiClient")>();
  return { ...original, apiRequest: vi.fn() };
});
const request = vi.mocked(apiRequest);
const file = new File(["image"], "örnek.png", { type: "image/png" });

describe("media service", () => {
  beforeEach(() => request.mockReset().mockResolvedValue({}));

  it("uploads profile media as FormData with the exact file part", async () => {
    await mediaService.uploadProfileAvatar(file);
    await mediaService.uploadProfileCover(file);
    for (const [path, options] of request.mock.calls) {
      expect(path).toMatch(/^\/media\/profile\/(avatar|cover)$/);
      expect(options?.body).toBeInstanceOf(FormData);
      expect((options?.body as FormData).get("file")).toBe(file);
      expect(options?.headers).toBeUndefined();
    }
  });

  it("encodes parent IDs and maps delete endpoints", async () => {
    await mediaService.uploadPostImage("post/slash", file);
    await mediaService.deletePostImage("post/slash", "media/slash");
    await mediaService.uploadWorkImage("work/slash", file);
    await mediaService.deleteWorkImage("work/slash", "media/slash");
    expect(request.mock.calls.map(([path]) => path)).toEqual([
      "/posts/post%2Fslash/media",
      "/posts/post%2Fslash/media/media%2Fslash",
      "/works/work%2Fslash/media",
      "/works/work%2Fslash/media/media%2Fslash",
    ]);
  });

  it("sends the complete reorder body and rejects blank IDs", async () => {
    await mediaService.reorderPostImages("post", ["one", "two"]);
    await mediaService.reorderWorkImages("work", ["three"]);
    expect(request).toHaveBeenNthCalledWith(1, "/posts/post/media/order", {
      method: "PUT", authenticated: true, body: { mediaIds: ["one", "two"] },
    });
    expect(request).toHaveBeenNthCalledWith(2, "/works/work/media/order", {
      method: "PUT", authenticated: true, body: { mediaIds: ["three"] },
    });
    expect(() => mediaService.uploadPostImage(" ", file)).toThrowError(
      expect.objectContaining({ code: "MEDIA_RELATION_INVALID" }),
    );
  });
});
