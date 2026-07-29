import { describe, expect, it } from "vitest";
import { MEDIA_LIMITS, validateImageFile } from "./mediaValidation";

function image(size: number, type: string, name = "görsel.png") {
  return new File([new Uint8Array(size)], name, { type });
}
describe("media validation", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s", (type) => {
    expect(validateImageFile(image(1, type), "post")).toEqual({ valid: true });
  });
  it.each(["image/svg+xml", "image/gif", "text/html"])("rejects %s", (type) => {
    expect(validateImageFile(image(1, type), "post").valid).toBe(false);
  });
  it("rejects empty files", () => {
    expect(validateImageFile(image(0, "image/png"), "avatar").valid).toBe(false);
  });
  it.each(["avatar", "cover", "post", "work"] as const)(
    "accepts the exact %s boundary and rejects one byte over",
    (purpose) => {
      expect(validateImageFile(image(MEDIA_LIMITS[purpose], "image/png"), purpose).valid).toBe(true);
      expect(validateImageFile(image(MEDIA_LIMITS[purpose] + 1, "image/png"), purpose).valid).toBe(false);
    },
  );
});
