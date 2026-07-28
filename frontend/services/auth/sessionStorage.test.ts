import { describe, expect, it } from "vitest";

import { STORAGE_KEYS } from "@/constants/storage";
import { sessionStorage } from "@/services/auth/sessionStorage";

describe("sessionStorage", () => {
  it("persists only refresh session data", () => {
    sessionStorage.write({
      refreshToken: "refresh-value",
      refreshTokenExpiresAt: "2030-01-01T00:00:00Z",
    });
    const raw = window.localStorage.getItem(STORAGE_KEYS.authSession);
    expect(raw).toContain("refresh-value");
    expect(raw).not.toContain("accessToken");
    expect(raw).not.toContain("password");
  });

  it("rejects malformed persisted data and clears legacy identity", () => {
    window.localStorage.setItem(STORAGE_KEYS.authSession, '{"accessToken":"x"}');
    window.localStorage.setItem(STORAGE_KEYS.legacyUser, '{"email":"mock"}');
    expect(sessionStorage.read()).toBeNull();
    sessionStorage.clear();
    expect(window.localStorage.length).toBe(0);
  });
});
