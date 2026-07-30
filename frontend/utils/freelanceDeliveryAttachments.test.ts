import { describe, expect, it } from "vitest";
import {
  safeDownloadFilename,
  validateDeliveryAttachments,
} from "./freelanceDeliveryAttachments";

const file = (name: string, type: string, size = 4) =>
  new File([new Uint8Array(size)], name, { type });

describe("delivery attachment validation", () => {
  it("accepts the phase-one allowlist", () => {
    expect(
      validateDeliveryAttachments([
        file("proof.png", "image/png"),
        file("brief.pdf", "application/pdf"),
        file("source.zip", "application/zip"),
      ]),
    ).toBeNull();
  });

  it("rejects invalid selections", () => {
    expect(validateDeliveryAttachments([file("empty.txt", "text/plain", 0)])).toMatch(/Empty/);
    expect(validateDeliveryAttachments([file("run.exe", "application/octet-stream")])).toMatch(/JPEG/);
    expect(validateDeliveryAttachments(Array.from({ length: 6 }, (_, i) => file(`${i}.txt`, "text/plain")))).toMatch(/5/);
    expect(validateDeliveryAttachments([file("huge.pdf", "application/pdf", 25 * 1024 * 1024 + 1)])).toMatch(/25 MB/);
  });

  it("does not accept a path from content disposition", () => {
    expect(
      safeDownloadFilename(
        "attachment; filename*=UTF-8''..%2Fprivate%2Fteslim.pdf",
        "fallback.pdf",
      ),
    ).toBe("teslim.pdf");
  });
});
